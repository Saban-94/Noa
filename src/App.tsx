import React, { useState, useEffect } from 'react';
import { GanttSchedule } from './components/GanttSchedule';
import { InventoryDashboard } from './components/InventoryDashboard';
import { ChatRoom } from './components/ChatRoom';
import { cn } from './lib/utils';
import { Menu, X, Box, LayoutGrid, Users, LogIn, Loader2, Signal, Shield, Truck, Zap, Database, Settings } from 'lucide-react';
import { Order, InventoryItem, OrderStatus } from './types';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDocFromServer } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(window.innerWidth > 1024);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(window.innerWidth > 1440);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);

  // Responsive handle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setLeftSidebarOpen(false);
      if (window.innerWidth < 1440) setRightSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // V41 Identity: Fixed as Operations Manager
  const currentPersona = {
    name: 'מנהל תפעול',
    role: 'Operational Lead',
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
    
    // Auth bypass for SabanOS V41
    const unsubscribe = onAuthStateChanged(auth, () => {
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Syncing ALL 19 Collections (Core Logic)
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    const collectionsToSync = [
      'ai_logs', 'brands', 'bridge_sessions', 'categories', 'chats', 
      'customers', 'drivers', 'encyclopedia_categories', 'encyclopedia_items', 
      'internal_team_chats', 'inventory', 'morning_reports', 'office_messages', 
      'orders', 'reminders', 'sales', 'user_magic_pages', 'user_settings', 'users'
    ];

    collectionsToSync.forEach(col => {
      const q = query(collection(db, col));
      const unsub = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          setStats(prev => ({ ...prev, [col]: snapshot.size }));
          
          if (col === 'orders') {
            setOrders(data.filter((o: any) => o.status !== 'delivered' && o.status !== 'סופק'));
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

  // V41 Logic: Real-time Driver Load
  const driverLoad = orders.reduce((acc, order) => {
    const name = order.driverName || 'ללא משבץ';
    if (order.status !== 'delivered' && order.status !== 'סופק' && order.status !== 'cancelled') {
      acc[name] = (acc[name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const [showMap, setShowMap] = useState(true);

  const handleAction = (type: string, payload: any) => {
    if (type === 'waze') {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(payload.address)}`, '_blank');
    } else if (type === 'view_map') {
      setLeftSidebarOpen(true);
      setShowMap(true);
    } else if (type === 'view_inventory') {
      setRightSidebarOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <Loader2 className="text-white animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] text-[#0f172a] font-sans relative" dir="rtl">
      {/* Background Pattern - V41 WhatsApp Cubes 6% */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06] z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Top Navigation Bar */}
      <header className="h-16 bg-[#0f172a] text-white flex items-center justify-between px-4 md:px-6 border-b border-slate-700 shrink-0 z-40 relative">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 rounded-full border border-yellow-500 overflow-hidden ring-1 ring-slate-800">
            <img src={currentPersona.avatar} alt="AI" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase mb-0.5 whitespace-nowrap">סבן Nexus V41</h1>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">ח.סבן חומרי בניין בע"מ</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="text-left hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none mb-1">זהות נוכחית</p>
            <div className="flex items-center gap-2 justify-end">
              <Shield size={10} className="text-yellow-500" />
              <p className="font-black uppercase tracking-tight text-white text-sm">{currentPersona.name}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
          <button 
            onClick={() => setAdminDrawerOpen(!adminDrawerOpen)}
            className="bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/10 transition-all text-yellow-500"
          >
            <Database size={20} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Sidebar - Siddur & Load */}
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <motion.aside 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#0f172a] text-white border-l border-slate-800 flex flex-col shrink-0 md:relative fixed inset-y-0 right-0 z-30 w-80 shadow-2xl md:shadow-none h-full"
            >
              <div className="p-5 border-b border-white/5 bg-gradient-to-br from-slate-900 to-[#0f172a]">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4">עומס נהגים</h2>
                <div className="space-y-3">
                  {drivers.length > 0 ? drivers.map(d => (
                    <div key={d.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 group hover:border-yellow-500/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-800 border border-white/5 overflow-hidden flex items-center justify-center font-bold text-xs">
                          {d.name?.charAt(0)}
                        </div>
                        <span className="text-xs font-black text-slate-200">{d.name}</span>
                      </div>
                      <div className="bg-yellow-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded shadow-lg">
                        {driverLoad[d.name] || 0}
                      </div>
                    </div>
                  )) : (
                    <p className="text-[10px] text-slate-600 italic">טוען נתונים...</p>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#070b14]/50">
                <GanttSchedule 
                  orders={orders} 
                  drivers={drivers} 
                  showMap={showMap} 
                  setShowMap={setShowMap} 
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center: Operational Chat */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f1f5f9]/50 relative backdrop-blur-sm shadow-inner h-full overflow-hidden">
          <ChatRoom 
            orders={orders} 
            inventory={inventory} 
            drivers={drivers.map(d => ({ name: d.name, currentLoad: driverLoad[d.name] || 0 }))} 
            onAction={handleAction} 
          />
        </main>

        {/* Right Sidebar: Unified Drawer Container */}
        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <motion.aside 
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white border-r border-slate-200 flex flex-col shrink-0 md:relative fixed inset-y-0 left-0 z-30 w-80 shadow-2xl md:shadow-none h-full"
            >
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                <div className="flex items-center gap-3 mb-2 flex-row-reverse">
                  <Box size={16} className="text-slate-400" />
                  <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">מערכות תומכות</h2>
                </div>
                
                <InventoryDashboard items={inventory} />
                
                <div className="h-px bg-slate-100"></div>
                
                <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-right">
                  <h2 className="text-[10px] font-black uppercase text-slate-400 mb-5 tracking-[0.2em]">ביצועי יום (V41)</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end flex-row-reverse">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">מכירות נטו</span>
                      <span className="text-xl font-black text-slate-900 tracking-tighter">₪{inventory.length > 0 ? (48250 + inventory.length * 10).toLocaleString() : '---'}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 w-[85%] rounded-full shadow-lg" />
                    </div>
                  </div>
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Admin Drawer Overlay */}
      <AnimatePresence>
        {adminDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-xl" 
              onClick={() => setAdminDrawerOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] border border-white/10"
            >
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Database className="text-yellow-500" />
                  <h2 className="text-xl font-black tracking-tight">SabanOS DNA - מרכז נתונים</h2>
                </div>
                <button onClick={() => setAdminDrawerOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-right custom-scrollbar">
                {Object.entries(stats).map(([col, count]) => (
                  <div key={col} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-yellow-500/30 transition-all cursor-default">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{col.replace('_', ' ')}</p>
                    <p className="text-xl font-black text-slate-900">{count.toLocaleString()}</p>
                  </div>
                ))}
                <div className="bg-slate-900 text-white p-6 rounded-2xl md:col-span-2 lg:col-span-4 border border-white/10 flex flex-col justify-center items-center gap-4 text-center">
                  <Shield className="text-yellow-500" size={40} />
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-widest">SabanOS V41 - The Final Truth Node</h3>
                    <p className="text-slate-400 text-sm font-bold">Intelligence DB & Drive DB Integrated Execution</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Control Hub */}
      <div className="fixed bottom-8 left-8 flex flex-col md:flex-row gap-3 z-40">
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className={cn(
            "size-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-95 border border-white/10",
            leftSidebarOpen ? "bg-white text-slate-900" : "bg-slate-900 text-white"
          )}
          style={{
            paddingBottom: '0px',
            marginRight: '99px',
            marginLeft: '99px',
            marginTop: '150px',
            marginBottom: '0px',
            paddingLeft: '1px'
          }}
        >
          {leftSidebarOpen ? <X size={20} /> : <Truck size={20} />}
        </button>
        <button 
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className={cn(
            "size-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-95 border border-white/10",
            rightSidebarOpen ? "bg-white text-slate-900" : "bg-slate-900 text-white"
          )}
          style={{
            paddingBottom: '0px',
            paddingTop: '0px',
            marginRight: '-90px',
            marginLeft: '0px',
            marginTop: '150px',
            marginBottom: '250px'
          }}
        >
          {rightSidebarOpen ? <X size={20} /> : <Database size={20} />}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234, 179, 8, 0.2); border-radius: 10px; }
      `}} />
    </div>
  );
}
