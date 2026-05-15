import React, { useState, useEffect } from 'react';
import { GanttSchedule } from './components/GanttSchedule';
import { InventoryDashboard } from './components/InventoryDashboard';
import { ChatRoom } from './components/ChatRoom';
import { cn } from './lib/utils';
import { Menu, X, Box, LayoutGrid, Users, LogIn, Loader2 } from 'lucide-react';
import { Order, InventoryItem, OrderStatus } from './types';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDocFromServer } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
    );

    const unsubInventory = onSnapshot(collection(db, 'inventory'), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setInventory(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'inventory')
    );

    return () => {
      unsubOrders();
      unsubInventory();
    };
  }, [user]);

  const handleAction = (type: string, payload: any) => {
    console.log(`Action: ${type}`, payload);
    if (type === 'waze') {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(payload.address)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <Loader2 className="text-white animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src="https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png" 
            className="w-full h-full object-cover opacity-20 scale-110 blur-sm"
            alt="Noa Background"
          />
        </div>
        
        <div className="relative z-10 text-center space-y-8 max-w-md">
          <div className="space-y-2">
            <h1 className="text-5xl font-black italic tracking-tighter uppercase">SabanOS Nexus</h1>
            <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Commander Operational Interface</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
            <p className="text-slate-300 text-sm mb-8 leading-relaxed">
              שלום ראמי, אני ממתינה לך. <br />אנא התחבר כדי לסנכרן את חדר המבצעים.
            </p>
            <button 
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-black py-4 rounded-xl hover:bg-slate-100 transition-all active:scale-95"
            >
              <LogIn size={20} />
              התחברות מפקד
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] text-[#0f172a] font-sans" dir="rtl">
      {/* Header */}
      <header className="h-16 bg-[#0f172a] text-white flex items-center justify-between px-6 border-b border-slate-700 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-yellow-500 overflow-hidden ring-2 ring-slate-800 ring-offset-2 ring-offset-slate-900">
            <img src="https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png" alt="Noa" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <h1 className="text-xl font-black tracking-tighter uppercase mb-0.5">SabanOS NEXUS 16</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Operational Command Center</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-left hidden sm:block text-right">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">מפקד נוכחי</p>
            <p className="font-black uppercase tracking-tight text-yellow-500 text-sm">{user.displayName || 'ראמי סבן'}</p>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/20 flex items-center gap-1.5">
              <div className="size-1.5 bg-green-400 rounded-full animate-pulse" />
              LIVE SYNC
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="התנתקות"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Schedule */}
        <aside className={cn(
          "bg-slate-900 text-white border-l border-slate-800 transition-all duration-300 overflow-hidden flex flex-col shrink-0 relative z-20",
          leftSidebarOpen ? "w-64" : "w-0"
        )}>
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">סידור עבודה חי (Gantt)</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-400">מנוף 1 - אבי</span>
                  <span className="text-green-400 italic">בדרך</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[70%] shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-400">מנוף 2 - יוסף</span>
                  <span className="text-yellow-400 italic">טעינה</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[30%] shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <GanttSchedule orders={orders} />
          </div>
        </aside>

        {/* Main Content - Chat */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
          <ChatRoom 
            orders={orders} 
            inventory={inventory} 
            drivers={[]} 
            onAction={handleAction} 
          />
        </main>

        {/* Right Sidebar - Inventory */}
        <aside className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden flex flex-col shrink-0 relative z-20",
          rightSidebarOpen ? "w-72" : "w-0"
        )}>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
            <InventoryDashboard items={inventory} />
            
            <div className="h-px bg-slate-100"></div>
            
            <section>
              <h2 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.2em]">אסטרטגיית מכירות</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black">היום</p>
                  <p className="text-lg font-black italic">₪42K</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black">יעד</p>
                  <p className="text-lg font-black italic">₪60K</p>
                </div>
              </div>
            </section>
          </div>
          
          <div className="p-4 bg-yellow-500/10 border-t border-yellow-500/20">
            <p className="text-[11px] font-black text-yellow-700 mb-1 italic">טיפ מנועה:</p>
            <p className="text-[11px] leading-tight text-yellow-900/80 font-medium">ראמי, מחירי הברזל צפויים לעלות מחר ב-3%. כדאי להקדים הזמנות ספקים.</p>
          </div>
        </aside>
      </div>

      {/* Control Toggles */}
      <div className="fixed bottom-6 left-6 flex gap-2 z-50">
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
        >
          {leftSidebarOpen ? <X size={18} /> : <LayoutGrid size={18} />}
        </button>
        <button 
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
        >
          {rightSidebarOpen ? <X size={18} /> : <Box size={18} />}
        </button>
      </div>
    </div>
  );
}
