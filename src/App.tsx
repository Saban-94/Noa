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

export default function App() {
  const [loading, setLoading] = useState(true);
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
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setLeftSidebarOpen(false);
      if (window.innerWidth < 1440) setRightSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // V44 Identity: Logistics Intelligence Hub
  const currentPersona = {
    name: 'נועה',
    role: 'מנהלת סידור',
    avatar: 'https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png'
  };

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        console.error("Connection test:", error);
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
        (error) => console.log(`Sync error [${col}]:`, error)
      );
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // 1. Core Data Filtering logic (Requirement 4)
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

  // 2. Unique Driver Load Distribution Metrics (Requirement 2 & 3)
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

  // Operational Driver Mapping (Requirement 3)
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

    // Reject files larger than 1MB for Firestore Base64 storage
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
      <div className="h-screen w-full flex items-center justify-center bg-[#0f172a]">
        <Loader2 className="text-yellow-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] text-[#0f172a] font-sans relative" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Top Header */}
      <header className="h-16 bg-[#0f172a] text-white flex items-center justify-between px-4 md:px-8 border-b border-white/5 shrink-0 z-40 relative shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl border-2 border-yellow-500/30 overflow-hidden ring-4 ring-yellow-500/10 shadow-lg shadow-yellow-500/20 translate-y-0.5">
            <img src={currentPersona.avatar} alt="Noa" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
              SabanOS <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-black">V44</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold opacity-70">ח.סבן חומרי בניין - מערכת בקרת הפצה</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="text-left hidden md:block border-l border-white/10 pl-6">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1 leading-none">מנהל תורן (נועה)</p>
            <div className="flex items-center gap-2 justify-end">
              <Shield size={12} className="text-blue-500" />
              <p className="font-black uppercase tracking-tight text-white text-sm">{currentPersona.role}</p>
            </div>
          </div>
          <button 
            onClick={() => setAdminDrawerOpen(true)}
            className="group relative flex items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-blue-600 text-slate-400 hover:text-white transition-all transform hover:rotate-3 shadow-lg"
          >
            <Database size={20} />
            <span className="absolute -top-1 -right-1 size-4 bg-blue-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[#0f172a] group-hover:bg-white group-hover:text-blue-600">
              {allOrders.length}
            </span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Left Sidebar: Driver Management */}
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#0f172a] text-white border-l border-white/5 flex flex-col shrink-0 md:relative fixed inset-y-0 right-0 z-30 w-80 shadow-2xl h-full"
            >
              <div className="p-6 border-b border-white/10 bg-slate-900/50">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-6 flex items-center justify-between">
                  עומס נהגים בזמן אמת <Truck size={14} className="text-yellow-500" />
                </h2>
                <div className="space-y-3">
                  {operationalDrivers.length > 0 ? operationalDrivers.map(d => (
                    <div key={d.id} className="flex justify-between items-center bg-white/5 p-3.5 rounded-2xl border border-white/5 group hover:border-blue-500/40 hover:bg-white/[0.07] transition-all cursor-default relative overflow-hidden">
                      { (driverLoad[d.id] || 0) > 0 && <div className="absolute top-0 right-0 w-0.5 h-full bg-blue-500/50" /> }
                      <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                          <div className="size-9 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center relative">
                            {d.icon ? (
                              <span className="text-sm">{d.icon}</span>
                            ) : d.avatarUrl || d.photoURL ? (
                              <img src={d.avatarUrl || d.photoURL} alt={d.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-xs text-slate-400">{d.name?.charAt(0)}</span>
                            )}
                            <div className={cn(
                              "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-slate-900 shadow-sm",
                              (driverLoad[d.id] || 0) > 0 ? "bg-emerald-500" : "bg-slate-500"
                            )} />
                          </div>
                          
                          {/* Avatar Upload for Real Drivers */}
                          {d.id !== 'unassigned' && d.id !== 'self' && (
                            <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-all rounded-xl">
                              <Camera size={14} className="text-white" />
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleAvatarUpload(d.id, e)}
                              />
                            </label>
                          )}
                        </div>

                        <div className="flex flex-col">
                           <span className="text-xs font-black text-slate-200 tracking-tight">{d.name}</span>
                           <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                             {d.id === 'unassigned' ? 'ממתין' : d.id === 'self' ? 'איסוף' : 'נהג פעיל'}
                           </span>
                        </div>
                      </div>
                      <div className={cn(
                        "text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg border transition-colors",
                        (driverLoad[d.id] || 0) > 3 
                          ? "bg-red-500/20 text-red-400 border-red-500/20" 
                          : (driverLoad[d.id] || 0) > 0
                             ? "bg-blue-500/20 text-blue-500 border-blue-500/20"
                             : "bg-slate-800 text-slate-600 border-white/5"
                      )}>
                        {driverLoad[d.id] || 0}
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 flex flex-col items-center justify-center text-slate-600 gap-2">
                       <Loader2 size={24} className="animate-spin opacity-20" />
                       <p className="text-[10px] font-bold uppercase tracking-widest italic">סנכרון נהגים...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-black/20">
                <GanttSchedule 
                  orders={activeOrders} 
                  drivers={drivers} 
                  showMap={showMap} 
                  setShowMap={setShowMap} 
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Operational Hub */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f1f5f9] relative h-full overflow-hidden">
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

        {/* Right Sidebar: Inventory & Metrics */}
        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white border-r border-slate-200 flex flex-col shrink-0 md:relative fixed inset-y-0 left-0 z-30 w-80 shadow-2xl h-full"
            >
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                <div className="flex items-center gap-3 mb-2 flex-row-reverse">
                  <Box size={16} className="text-slate-300" />
                  <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">לוגיסטיקה ומלאי</h2>
                </div>
                
                <InventoryDashboard items={inventory} />
                
                <div className="h-px bg-slate-100"></div>
                
                <section className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-right shadow-sm">
                  <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-[0.3em] flex items-center justify-end gap-2">
                    ביצועים יומיים <Zap size={12} className="text-yellow-500" />
                  </h2>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end flex-row-reverse">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">מכירות (משוער)</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tighter">₪{(48250 + inventory.length * 150).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden ring-4 ring-slate-100">
                      <div className="h-full bg-[#0f172a] w-[78%] rounded-full shadow-lg relative">
                         <div className="absolute top-0 right-0 h-full w-20 bg-yellow-500/20 blur-md animate-pulse" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold text-center italic">עמידה ב-78% מיעד ההפצה היומי</p>
                  </div>
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
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
                    <h2 className="text-2xl font-black tracking-tight leading-none mb-1">SabanOS DNA - מרכז נתונים</h2>
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
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-2">SabanOS V44 - Intelligence Engine</h3>
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

      {/* Persistence Hub Control */}
      <div className="fixed bottom-8 left-8 flex flex-col md:flex-row gap-3 z-40">
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className={cn(
            "size-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 border-white/10 backdrop-blur-md",
            leftSidebarOpen ? "bg-white text-slate-900 shadow-white/20" : "bg-slate-900 text-white shadow-slate-950/40"
          )}
          style={{ marginBottom: '550px' }}
        >
          {leftSidebarOpen ? <X size={22} /> : <Truck size={22} />}
        </button>
        <button 
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className={cn(
            "size-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 border-white/10 backdrop-blur-md",
            rightSidebarOpen ? "bg-white text-slate-900 shadow-white/20" : "bg-slate-900 text-white shadow-slate-950/40"
          )}
          style={{ marginBottom: '300px' }}
        >
          {rightSidebarOpen ? <X size={22} /> : <Database size={22} />}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234, 179, 8, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(234, 179, 8, 0.3); }
      `}} />
    </div>
  );
}
