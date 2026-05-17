import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Menu, Shield, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateNoaResponse, AIResponse } from '../services/aiService';
import { OrderCard } from './OrderCard';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface ChatRoomProps {
  orders: any[];
  inventory: any[];
  drivers: any[];
  onAction: (type: string, payload: any) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ orders, inventory, drivers, onAction }) => {
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      role: 'assistant',
      text: `<div class="space-y-4">
        <p class="font-black text-[#1E3A8A]">שלום ראמי אהובי, המפקד.</p>
        <div class="border-r-4 border-[#C5A059] bg-[#F8FAFC] p-4 rounded-lg shadow-sm">
          <p class="text-sm">הכל מסונכרן. כל מערכות ה-SabanOS פעילות. איך אוכל לסייע לך בניהול הלוגיסטיקה היום?</p>
        </div>
        <p class="text-[10px] text-slate-400 italic">באדיבות נועה ❤️</p>
      </div>`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const executeOperationalAction = async (type: string, payload: any) => {
    try {
      console.log(`Executing ${type}:`, payload);
      
      if (type === 'dispatch' && payload.orderId) {
        const orderRef = doc(db, 'orders', payload.orderId);
        await updateDoc(orderRef, {
          status: 'scheduled',
          updatedAt: serverTimestamp(),
          driverId: payload.driverId || 'DRIVER-AUTO',
          driverName: payload.driverName || 'נהג תורן'
        });
      } else if (type === 'update_inventory' && payload.itemId) {
        const itemRef = doc(db, 'inventory', payload.itemId);
        await updateDoc(itemRef, {
          quantity: payload.newQuantity,
          updatedAt: serverTimestamp()
        });
      } else if (type === 'waze') {
        onAction('waze', payload);
      }
      
      // Notify AI of success
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: `<div class="bg-emerald-50 border-r-4 border-emerald-500 p-3 rounded text-[#1E293B] font-bold">
          בוצע אהובי. הפעולה הושלמה וסונכרנה במערכת.
          <p class="text-[9px] mt-2 opacity-50 uppercase tracking-widest text-left">באדיבות נועה ❤️</p>
        </div>`,
        timestamp: Date.now()
      }]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'operational_action');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const aiResponse = await generateNoaResponse(input, { orders, inventory, drivers, user: auth.currentUser?.displayName || 'Rami' });
    
    // Log AI interaction
    try {
      await addDoc(collection(db, 'ai_logs'), {
        userId: auth.currentUser?.uid,
        prompt: input,
        response: aiResponse.text,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not log AI interaction", e);
    }

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      ...aiResponse,
      timestamp: Date.now()
    }]);
    
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden">
      {/* Messages */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pt-10 overscroll-contain"
      >
        <motion.div layout className="flex flex-col gap-8 min-h-full justify-end">
          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className={cn(
                  "flex items-start gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
              {/* Avatar for AI */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full border border-slate-300 overflow-hidden flex-shrink-0 mt-1 shadow-sm">
                  <img src="https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png" className="w-full h-full object-cover" alt="Noa" />
                </div>
              )}

              {/* Avatar for User */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-1 shadow-sm uppercase">
                  {(auth.currentUser?.displayName || 'RS').split(' ').map(n => n[0]).join('')}
                </div>
              )}

              <div className={cn(
                "max-w-[85%] space-y-4",
                msg.role === 'user' ? "items-end text-right" : "items-start text-right"
              )}>
                {msg.role === 'user' ? (
                  <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none text-sm font-medium shadow-md">
                    {msg.text}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed text-slate-800">
                    <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                    
                    {/* Render AI Component if exists */}
                    {(msg.componentType === 'OrderInfo' || msg.data?.order) && (
                      <div className="mt-5 pt-5 border-t border-slate-100">
                        <OrderCard 
                          order={(() => {
                            const snap = msg.data?.order || msg.data;
                            if (!snap?.id) return snap;
                            const live = orders.find((o: any) => o.id === snap.id);
                            return live ? { ...snap, ...live } : snap;
                          })()} 
                          onAction={executeOperationalAction} 
                          className="shadow-lg" 
                        />
                      </div>
                    )}

                    {msg.componentType === 'OrderList' && msg.data?.orders && (
                      <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">נמצאו {msg.data.orders.length} הזמנות</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {msg.data.orders.map((order: any, i: number) => (
                            <OrderCard 
                              key={i} 
                              order={(() => {
                                const live = orders.find((o: any) => o.id === order.id);
                                return live ? { ...order, ...live } : order;
                              })()} 
                              onAction={executeOperationalAction} 
                              className="shadow-md" 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {msg.actions.map((action: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => executeOperationalAction(action.type, action.payload)}
                            className="text-[11px] font-black py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest shadow-sm"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        </motion.div>
        
        {isTyping && (
          <div className="flex items-center gap-3 text-slate-400 ml-12 py-4">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">נועה מעבדת נתונים...</span>
          </div>
        )}

        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-900 rounded-full py-2 px-4 text-[10px] font-black uppercase tracking-widest shadow-2xl z-20 border border-yellow-400/50"
            >
              המשך למטה
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
        <div className="relative flex items-center bg-slate-100 rounded-full pl-2 pr-6 py-2 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="הקלד פקודה ל-SabanOS..."
            className="flex-1 bg-transparent border-none outline-none text-sm py-2 placeholder:text-slate-400 font-bold"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-all disabled:opacity-30 disabled:scale-95 shadow-lg shadow-slate-900/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
