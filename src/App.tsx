import React, { useState, useEffect, useMemo } from 'react';
import { GanttSchedule } from './components/GanttSchedule';
import { InventoryDashboard } from './components/InventoryDashboard';
import { ChatRoom } from './components/ChatRoom';
import { cn } from './lib/utils';
import { 
  X, 
  Box, 
  Database, 
  Loader2, 
  Shield, 
  Truck, 
  History, 
  MapPin, 
  Clock,
  ExternalLink,
  Package,
  Zap,
  Upload,
  Camera
} from 'lucide-react';
import { Order, InventoryItem } from './types';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, doc, getDocFromServer, updateDoc } from 'firebase/firestore';

import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';

import { handleFirestoreError, OperationType } from './lib/errorHandling';
import { playSound } from './lib/audioService';
import OneSignal from 'react-onesignal';

export default function App() {
  const [loading, setLoading] = useState(true);

  // Initialize OneSignal (PWA Engine v57)
  useEffect(() => {
    OneSignal.init({
      appId: '06fa3292-cfc4-42e4-a64a-d629e58ec9b3',
      allowLocalhostAsSecureOrigin: true,
    }).then(() => {
      console.log('OneSignal Initialized');
    });
  }, []);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(window.innerWidth > 1024);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(window.innerWidth > 1440);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'stats' | 'history'>('stats');

  // Responsive handle
  // Custom Bottom Nav for Mobile
  const [activeScreen, setActiveScreen] = useState<'chat' | 'siddur' | 'inventory' | 'history'>('chat');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else {
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hybrid Routing Logic
  useEffect(() => {
    if (activeScreen === 'siddur') setLeftSidebarOpen(true);
    if (activeScreen === 'inventory') setRightSidebarOpen(true);
    if (activeScreen === 'chat') {
      if (window.innerWidth < 1024) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      }
    }
  }, [activeScreen]);

  // V57 Identity: Noa-Saban PWA Engine
  const currentPersona = {
    name: 'נועה',
    role: 'מערך שליטה v57',
    avatar: 'https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png'
  };

  useEffect(() => {
    async function testConnection() {
      const path = 'test/connection';
      try {
        await getDocFromServer(doc(db, path));
      } catch (error) {
        console.warn("Initial connection test failed, retrying in 2s...", error);
        setTimeout(async () => {
          try {
            await getDocFromServer(doc(db, path));
          } catch (retryError) {
            handleFirestoreError(retryError, OperationType.GET, path);
          }
        }, 2000);
      }
    }
    testConnection();
    
    const unsubscribe = onAuthStateChanged(auth, () => {
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Syncing CORE Collections
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    const collectionsToSync = [
      'orders', 'inventory', 'drivers', 'customers', 'chats', 'morning_reports'
    ];

    collectionsToSync.forEach(col => {
      const q = query(collection(db, col));
      const unsub = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          setStats(prev => ({ ...prev, [col]: snapshot.size }));
          
          if (col === 'orders') {
            setAllOrders(data);
          } else if (col === 'inventory') {
            setInventory(data as InventoryItem[]);
          } else if (col === 'drivers') {
            setDrivers(data);
          } else if (col === 'customers') {
            setCustomers(data);
          }
        },
        (error) => {
          console.warn(`Sync warning [${col}]:`, error);
          if (error.message.includes('permissions')) {
             // Handle gracefully or log with detail
             // handleFirestoreError(error, OperationType.LIST, col);
          }
        }
      );
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // 1. Core Data Filtering logic
  const activeOrders = useMemo(() => {
    return allOrders.filter(o => 
      o.status !== 'delivered' && 
      o.status !== 'סופק' && 
      o.status !== 'cancelled' && 
      o.status !== 'מבוטל'
    );
  }, [allOrders]);

  const historyOrders = useMemo(() => {
    return allOrders.filter(o => 
      o.status === 'delivered' || 
      o.status === 'סופק'
    );
  }, [allOrders]);

  // 2. Unique Driver Load Distribution Metrics
  const driverLoad = useMemo(() => {
    const load: Record<string, number> = {
      unassigned: 0,
      self: 0
    };
    
    activeOrders.forEach(order => {
      const dId = order.driverId || 'unassigned';
      load[dId] = (load[dId] || 0) + 1;
    });
    
    return load;
  }, [activeOrders]);

  // Alert system for overloaded drivers
  const prevOverloadedDrivers = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    const currentOverloaded = new Set<string>();
    Object.entries(driverLoad).forEach(([driverId, count]) => {
      if ((count as number) > 3 && driverId !== 'unassigned' && driverId !== 'self') {
        currentOverloaded.add(driverId);
      }
    });

    // Check for NEWLY overloaded drivers
    let newlyOverloaded = false;
    currentOverloaded.forEach(dId => {
      if (!prevOverloadedDrivers.current.has(dId)) {
        newlyOverloaded = true;
      }
    });

    if (newlyOverloaded) {
      playSound('alert');
    }

    prevOverloadedDrivers.current = currentOverloaded;
  }, [driverLoad]);

  // Operational Driver Mapping
  const operationalDrivers = useMemo(() => {
    // Add virtual drivers for system states
    const virtualDrivers = [
      { id: 'unassigned', name: 'ממתין לשיבוץ', icon: '⏳' },
      { id: 'self', name: 'איסוף עצמי', icon: '📦' }
    ];

    const mappedDrivers = drivers.map(d => {
      let name = d.name;
      if (d.id === 'hikmat' || name?.includes('חכמת')) name = "חכמת (מנוף 🏗️)";
      if (d.id === 'ali' || name?.includes('עלי')) name = "עלי (משאית 🚛)";
      return { ...d, name };
    });

    // Merge and deduplicate
    const all = [...virtualDrivers, ...mappedDrivers];
    const seen = new Set();
    return all.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [drivers]);

  const [showMap, setShowMap] = useState(true);

  const handleAction = (type: string, payload: any) => {
    if (type === 'waze') {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(payload.address)}`, '_blank');
    } else if (type === 'view_map') {
      setLeftSidebarOpen(true);
      setShowMap(true);
    } else if (type === 'view_inventory') {
      setRightSidebarOpen(true);
    } else if (type === 'update_order_from_ai') {
      const { orderId, aiData, driveUrl } = payload;
      console.log(`[Noa App] Updating order ${orderId} with AI context...`, aiData);
      
      const orderRef = doc(db, 'orders', orderId);
      const updateData: any = {
        updatedAt: new Date().toISOString(),
        noa_brain_analysis: aiData,
        lastDocUrl: driveUrl
      };

      // Apply structural updates if AI found them
      if (aiData.orderNumber) updateData.orderNumber = aiData.orderNumber;
      if (aiData.items && Array.isArray(aiData.items) && aiData.items.length > 0) {
        updateData.items = aiData.items;
      }
      if (aiData.hasSignature !== undefined) {
        updateData.isSigned = aiData.hasSignature;
      }

      updateDoc(orderRef, updateData).catch(err => console.error("AI Sync Error:", err));
    }
  };

  const handleAvatarUpload = async (driverId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("התמונה גדולה מדי. אנא העלו תמונה קטנה מ-1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const driverRef = doc(db, 'drivers', driverId);
        await updateDoc(driverRef, { 
          avatarUrl: base64,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating avatar:", error);
        alert("שגיאה בעדכון התמונה.");
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#1E293B]">
        <Loader2 className="text-[#C5A059] animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] text-[#1E293B] font-sans relative" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Top Header */}
      <header className="h-20 bg-[#1E293B] text-white flex items-center justify-between px-6 md:px-10 border-b border-white/5 shrink-0 z-50 relative shadow-2xl">
        <div className="flex items-center gap-5">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 rounded-2xl border-2 border-[#C5A059]/40 overflow-hidden ring-4 ring-[#C5A059]/10 shadow-2xl shadow-[#C5A059]/20"
          >
            <img src={currentPersona.avatar} alt="Noa" className="w-full h-full object-cover" />
          </motion.div>
          <div className="leading-none">
            <h1 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-2">
              SabanOS <span className="bg-[#C5A059] text-[#1E293B] text-[11px] px-2 py-0.5 rounded-lg font-black tracking-widest shadow-lg shadow-[#C5A059]/20">V57</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#C5A059] font-bold opacity-80 mt-1">ח.סבן חומרי בניין - ליבת ה-PWA</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-left hidden lg:block border-l border-white/10 pl-6 h-10 flex flex-col justify-center">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1 leading-none">מנהל תורן</p>
            <div className="flex items-center gap-2 justify-end">
              <Shield size={12} className="text-[#C5A059]" />
              <p className="font-black tracking-tight text-white text-sm">{currentPersona.role}</p>
            </div>
          </div>
          <button 
            onClick={() => setAdminDrawerOpen(true)}
            className="group relative flex items-center justify-center size-12 rounded-2xl bg-white/5 hover:bg-[#C5A059] text-slate-400 hover:text-[#1E293B] transition-all shadow-xl border border-white/10"
          >
            <Database size={22} />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Sidebar (Desktop Only) / Siddur Panel */}
        <AnimatePresence mode="wait">
          {(leftSidebarOpen || (activeScreen === 'siddur' && window.innerWidth < 1024)) && (
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ width: '280px' }}
              className="bg-[#1E293B] text-white border-l border-white/5 flex flex-col shrink-0 lg:relative absolute inset-y-0 right-0 z-40 shadow-2xl h-full"
            >
              <div className="p-6 border-b border-white/10 bg-black/20">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">עומס נהגים</h2>
                   <Truck size={16} className="text-[#C5A059]" />
                </div>
                <div className="space-y-2.5">
                  {operationalDrivers.map(d => {
                    const loadCount = driverLoad[d.id] || 0;
                    
                    let status = { label: 'תת-עומס', color: 'text-blue-400', bg: 'bg-blue-400/10', dot: 'bg-blue-400' };
                    if (loadCount > 1 && loadCount <= 3) {
                      status = { label: 'אופטימלי', color: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' };
                    } else if (loadCount > 3) {
                      status = { label: 'עומס יתר', color: 'text-red-400', bg: 'bg-red-400/10', dot: 'bg-red-400' };
                    }

                    return (
                      <div key={d.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-[10px] border border-white/10 shadow-inner shrink-0">
                             {d.icon || d.name?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-300">{d.name}</span>
                              <div className={cn("size-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", status.dot)} />
                            </div>
                            <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5 w-fit", status.bg, status.color)}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-black text-[#C5A059] group-hover:scale-110 transition-transform">{loadCount}</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">הזמנות</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/10">
                <GanttSchedule 
                  orders={activeOrders} 
                  drivers={drivers} 
                  showMap={showMap} 
                  setShowMap={setShowMap} 
                />
              </div>
              
              {window.innerWidth < 1024 && (
                <button 
                  onClick={() => setActiveScreen('chat')}
                  className="m-4 bg-[#C5A059] text-[#1E293B] py-4 rounded-xl font-black text-sm shadow-lg uppercase tracking-widest h-12 flex items-center justify-center"
                >
                  חזרה לצ'אט
                </button>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content Engine Hub */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0 bg-[#f1f5f9] relative h-full overflow-hidden transition-all duration-500",
          (leftSidebarOpen && window.innerWidth >= 1024) ? "mr-0" : "",
          (rightSidebarOpen && window.innerWidth >= 1024) ? "ml-0" : ""
        )}>
           <ChatRoom 
            orders={activeOrders} 
            inventory={inventory} 
            drivers={drivers.map(d => ({ 
              id: d.id,
              name: d.name, 
              currentLoad: driverLoad[d.id] || 0 
            }))} 
            onAction={handleAction} 
          />
        </main>

        {/* Right Sidebar: Inventory & Proactive Metrics */}
        <AnimatePresence mode="wait">
          {(rightSidebarOpen || (activeScreen === 'inventory' && window.innerWidth < 1024)) && (
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ width: '280px' }}
              className="bg-white border-r border-slate-200 flex flex-col shrink-0 lg:relative absolute inset-y-0 left-0 z-40 shadow-2xl h-full"
            >
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                <div className="flex items-center justify-between flex-row-reverse border-b border-slate-100 pb-4">
                  <Box size={18} className="text-[#C5A059]" />
                  <h2 className="text-[11px] font-black uppercase text-slate-800 tracking-[0.2em]">מלאי ולוגיסטיקה</h2>
                </div>
                
                <InventoryDashboard items={inventory} />
                
                <section className="bg-[#1E293B] p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                  <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-[0.3em] flex items-center justify-end gap-2">
                    ביצועים יומיים <Zap size={14} className="text-[#C5A059] animate-pulse" />
                  </h2>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end flex-row-reverse">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none">תפוקה גלובלית</span>
                      <span className="text-3xl font-black text-white tracking-tighter">₪{(48250 + inventory.length * 150).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden ring-1 ring-white/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '78%' }}
                        className="h-full bg-gradient-to-l from-[#C5A059] to-[#EAB308] rounded-full shadow-[0_0_20px_rgba(197,160,89,0.4)]"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold text-center italic opacity-60">הפצה: 78% מעמידה ביעד</p>
                  </div>
                </section>
                
                {window.innerWidth < 1024 && (
                  <button 
                    onClick={() => setActiveScreen('chat')}
                    className="w-full bg-[#1E293B] text-white py-4 rounded-xl font-black text-sm h-12 flex items-center justify-center shadow-lg"
                  >
                    חזור לצ'אט
                  </button>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Bottom Nav for Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 flex items-center justify-around px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
           <button onClick={() => setActiveScreen('chat')} className={cn("flex flex-col items-center gap-1", activeScreen === 'chat' ? "text-blue-600" : "text-slate-400")}>
             <Shield size={20} fill={activeScreen === 'chat' ? "currentColor" : "none"} />
             <span className="text-[9px] font-black uppercase">נועה</span>
           </button>
           <button onClick={() => setActiveScreen('siddur')} className={cn("flex flex-col items-center gap-1", activeScreen === 'siddur' ? "text-blue-600" : "text-slate-400")}>
             <Truck size={20} />
             <span className="text-[9px] font-black uppercase">סידור</span>
           </button>
           <button onClick={() => setActiveScreen('inventory')} className={cn("flex flex-col items-center gap-1", activeScreen === 'inventory' ? "text-blue-600" : "text-slate-400")}>
             <Box size={20} />
             <span className="text-[9px] font-black uppercase">מלאי</span>
           </button>
           <button onClick={() => setAdminDrawerOpen(true)} className="flex flex-col items-center gap-1 text-slate-400">
             <Database size={20} />
             <span className="text-[9px] font-black uppercase">DNA</span>
           </button>
        </div>
      </div>

      {/* Data Center & History Drawer */}
      <AnimatePresence>
        {adminDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-3xl" 
              onClick={() => setAdminDrawerOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[85vh] border border-white/10"
            >
              <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center shrink-0 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500 rounded-2xl text-[#0f172a]">
                    <Database size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight leading-none mb-1">SabanOS DNA v57 - מרכז נתונים</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data Integrity & Historical Manifests</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => setAdminTab('stats')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-black text-xs transition-all",
                      adminTab === 'stats' ? "bg-yellow-500 text-[#0f172a]" : "text-slate-400 hover:text-white"
                    )}
                  >
                    סטטיסטיקה
                  </button>
                  <button 
                    onClick={() => setAdminTab('history')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2",
                      adminTab === 'history' ? "bg-yellow-500 text-[#0f172a]" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <History size={14} /> היסטוריית הפצות
                  </button>
                </div>
                
                <button onClick={() => setAdminDrawerOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {adminTab === 'stats' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-right">
                    {Object.entries(stats).map(([col, count]) => (
                      <div key={col} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:border-yellow-500/40 transition-all group">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{col.replace('_', ' ')}</p>
                        <p className="text-3xl font-black text-[#0f172a] tracking-tighter group-hover:scale-105 transition-transform origin-right">{count.toLocaleString()}</p>
                      </div>
                    ))}
                    
                    <div className="bg-[#0f172a] text-white p-10 rounded-[2.5rem] md:col-span-2 lg:col-span-4 border border-white/10 flex flex-col items-center gap-6 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-transparent to-blue-500/5 opacity-50" />
                      <Shield className="text-yellow-500 relative z-10" size={56} strokeWidth={1.5} />
                      <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Noa-Saban PWA Engine v57 - Intelligence Engine</h3>
                        <p className="text-slate-400 text-sm font-bold max-w-xl mx-auto leading-relaxed shadow-sm">
                          כל הנתונים המוצגים מסונכרנים בזמן אמת מול ליבת ה-DNA של ח.סבן חומרי בניין. 
                          המערכת מנהלת כרגע {allOrders.length} תיעודים לוגיסטיים מלאים.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-right">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black border border-emerald-100">
                          {historyOrders.length} הזמנות שהושלמו
                        </div>
                      </div>
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                         ארכיון הפצות שהסתיימו <Package size={20} className="text-slate-400" />
                      </h3>
                    </div>
                    
                    <div className="grid gap-3">
                      {historyOrders.length > 0 ? historyOrders.map((order) => (
                        <div key={order.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center flex-row-reverse hover:bg-white transition-all hover:shadow-lg group">
                          <div className="flex items-center gap-5 flex-row-reverse flex-1">
                             <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">לקוח</span>
                                <span className="text-base font-black text-slate-800 leading-none">{order.customerName}</span>
                             </div>
                             <div className="h-8 w-px bg-slate-200 mx-2" />
                             <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">מזהה</span>
                                <span className="text-xs font-mono font-bold text-slate-500">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                             </div>
                             <div className="h-8 w-px bg-slate-200 mx-2" />
                             <div className="flex flex-col items-end flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">כתובת</span>
                                <div className="flex items-center gap-2 flex-row-reverse opacity-70">
                                   <MapPin size={10} className="text-slate-400" />
                                   <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{order.destination || order.deliveryAddress}</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                             <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">מועד סיום</span>
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                                   <Clock size={12} />
                                   <span>
                                      {(() => {
                                        const rawTime = order.time ? String(order.time).trim() : '';
                                        if (rawTime && !rawTime.includes('03:00') && !rawTime.includes('3:00')) return rawTime + ' ';
                                        return '';
                                      })()}
                                      {(() => {
                                        const d = order.deliveryDate || order.updatedAt;
                                        if (!d) return 'נפרק בהצלחה';
                                        if (typeof d === 'string') return d;
                                        if (d && typeof d === 'object' && ('seconds' in (d as any) || 'toDate' in (d as any))) {
                                          const date = (d as any).toDate ? (d as any).toDate() : new Date((d as any).seconds * 1000);
                                          return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                                        }
                                        return 'נפרק בהצלחה';
                                      })()}
                                   </span>
                                </div>
                             </div>
                             <button 
                                onClick={() => handleAction('waze', { address: order.destination || order.deliveryAddress })}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all opacity-0 group-hover:opacity-100"
                             >
                                <ExternalLink size={18} />
                             </button>
                          </div>
                        </div>
                      )) : (
                        <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                           <History size={48} className="mx-auto text-slate-200" />
                           <p className="text-slate-400 font-bold">אין נתונים היסטוריים להצגה בתאריכים שנבחרו</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234, 179, 8, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(234, 179, 8, 0.3); }
      `}} />
    </div>
  );
}
