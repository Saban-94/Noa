import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Menu, Shield, Loader2, Paperclip } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateNoaResponse, AIResponse } from '../services/aiService';
import { OrderCard } from './OrderCard';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { playSound } from '../lib/audioService';

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
      text: `<div class="space-y-4 backdrop-blur-md bg-white/80 p-6 rounded-[2.5rem] border border-[#C5A059]/20 shadow-2xl">
        <p style="font-size: 20px; font-weight: 900;" class="text-[#1E293B] tracking-tighter">שלום ראמי אהובי, המפקד.</p>
        <div class="border-r-4 border-[#C5A059] bg-slate-50/50 p-6 rounded-3xl shadow-inner">
          <p class="text-base font-bold leading-relaxed text-slate-700">כל מערכות ה-PWA Core Engine v56 מסונכרנות. 19 מסדי נתונים פעילים ב-Double Sync. איך נועה יכולה לסייע בבניין הקיסרות היום?</p>
        </div>
        <div class="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-bold signature italic">באדיבות נועה ❤️</div>
      </div>`,
      timestamp: Date.now()
    }
  ]);

  // Web Audio Synthesizer (V56 Protocol)
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
      alert('סוג קובץ לא נתמך. אנא העלו PNG, JPEG או PDF.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;
      const pureBase64 = base64Data.split(',')[1];

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'chat_upload_' + Date.now(),
          fileData: pureBase64,
          mimeType: file.type,
          fileName: file.name
        }),
      });

      if (!response.ok) throw new Error('נכשל בניתוח המסמך');

      const result = await response.json();
      const aiData = result.data;
      
      // Construct a summary string
      let summary = `\n[ניתוח מסמך ע"י נועה המוח]:\n`;
      summary += `סוג מסמך: ${aiData.documentType === 'receipt' ? 'תעודת משלוח' : aiData.documentType === 'invoice' ? 'חשבונית' : 'צילום אתר'}\n`;
      if (aiData.orderNumber) summary += `מספר הזמנה: ${aiData.orderNumber}\n`;
      if (aiData.customerName) summary += `לקוח: ${aiData.customerName}\n`;
      if (aiData.items && aiData.items.length > 0) {
        summary += `פריטים:\n`;
        aiData.items.forEach((item: any) => {
          summary += `- ${item.productName}: ${item.quantity} ${item.unit || 'יח\''}\n`;
        });
      }
      if (aiData.hasSignature !== undefined) summary += `חתימה קיימת: ${aiData.hasSignature ? 'כן' : 'לא'}\n`;
      if (aiData.siteCondition) summary += `מצב אתר: ${aiData.siteCondition}\n`;

      setInput(prev => (prev ? prev + summary : summary));
    } catch (err) {
      console.error(err);
      alert('שגיאה בעיבוד המסמך ע"י נועה המוח');
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const executeOperationalAction = async (type: string, payload: any, actionId?: string) => {
    if (executingActionId) return;
    setExecutingActionId(actionId || type);
    
    try {
      console.log(`Executing ${type}:`, payload);
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));

      if (type === 'dispatch' && payload.orderId) {
        const orderRef = doc(db, 'orders', payload.orderId);
        await updateDoc(orderRef, {
          status: 'scheduled',
          updatedAt: serverTimestamp(),
          driverId: payload.driverId || 'DRIVER-AUTO',
          driverName: payload.driverName || 'נהג תורן'
        });
      } else if (type === 'send_schedule' || type === 'dispatch_all') {
        // Mocking schedule broadcast to morning_reports
        await addDoc(collection(db, 'morning_reports'), {
          type: 'DRIVER_SYNC',
          sender: auth.currentUser?.uid,
          timestamp: serverTimestamp(),
          status: 'SENT'
        });
      } else if (type === 'update_inventory' && payload.itemId) {
        const itemRef = doc(db, 'inventory', payload.itemId);
        await updateDoc(itemRef, {
          quantity: payload.newQuantity,
          updatedAt: serverTimestamp()
        });
      } else if (type === 'waze' || type === 'view_map' || type === 'view_inventory') {
        onAction(type, payload);
      }
      
      // Notify AI of success with Noa's specific message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: `<div class="bg-emerald-50 border-r-4 border-emerald-500 p-4 rounded-xl text-[#065F46] font-bold shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
          <div class="flex items-center gap-2 mb-1">
            <div class="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>בוצע אהובי.</span>
          </div>
          <p class="text-xs">הפעולה הושלמה וסונכרנה במערכת. באדיבות נועה ❤️</p>
        </div>`,
        timestamp: Date.now()
      }]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'operational_action');
    } finally {
      setExecutingActionId(null);
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
    playSound('sent');

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
    
    if (aiResponse.audioTone) {
      playSound(aiResponse.audioTone as any);
    } else {
      playSound('received');
    }
    
    setIsTyping(false);
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Support both old action-type and new V48 intent attributes
      const button = target.closest('button[data-action-type], button[data-intent]');
      
      if (button) {
        const type = button.getAttribute('data-intent') || button.getAttribute('data-action-type');
        const payloadStr = button.getAttribute('data-payload') || button.getAttribute('data-action-payload');
        
        if (type) {
          try {
            const payload = payloadStr ? JSON.parse(payloadStr) : {};
            executeOperationalAction(type, payload);
          } catch (err) {
            // If it's not JSON (like data-payload="דבק"), just pass it as a string payload
            console.warn("Failed to parse action payload as JSON, passing as string", err);
            executeOperationalAction(type, payloadStr || {});
          }
        }
      }
    };

    container.addEventListener('click', handleContainerClick);
    return () => container.removeEventListener('click', handleContainerClick);
  }, [messages, drivers]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden">
      {/* Messages */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pt-10 overscroll-contain"
      >
        <motion.div layout ref={messagesContainerRef} className="flex flex-col gap-8 min-h-full justify-end">
          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                style={{ width: '837.558px' }}
                className={cn(
                  "flex items-start gap-4 mx-auto",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
              {/* Avatar for AI */}
              {msg.role === 'assistant' && (
                <div 
                  style={{ width: '35.5151px', height: '35.5151px' }}
                  className="rounded-full border border-slate-300 overflow-hidden flex-shrink-0 mt-1 shadow-sm"
                >
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
                        {msg.actions.map((action: any, i: number) => {
                          const actionId = `action-${msg.id}-${i}`;
                          const isLoading = executingActionId === actionId || executingActionId === action.type;
                          
                          // Normalize action types based on label keywords if needed
                          let finalType = action.type;
                          const label = action.label?.toLowerCase() || '';
                          if (label.includes('שלח שיבוץ')) finalType = 'send_schedule';
                          if (label.includes('מפת לוגיסטיקה')) finalType = 'view_map';
                          if (label.includes('מלאי חסר')) finalType = 'view_inventory';

                          return (
                            <button
                              key={i}
                              disabled={!!executingActionId}
                              onClick={() => executeOperationalAction(finalType, action.payload, actionId)}
                              className={cn(
                                "text-[11px] font-black py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm border",
                                isLoading 
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                                  : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 shadow-slate-900/10"
                              )}
                            >
                              {isLoading && <Loader2 size={12} className="animate-spin" />}
                              {action.label}
                            </button>
                          );
                        })}
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
        <AnimatePresence>
          {isUploadingDoc && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 mb-3 bg-blue-50 px-4 py-2 rounded-xl text-blue-600 text-xs font-black"
            >
              <Loader2 size={14} className="animate-spin" />
              <span>נועה המוח סורקת מסמך... המתן בבקשה</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="relative flex items-center bg-slate-100 rounded-full pl-2 pr-6 py-2 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="הקלד פקודה ל-SabanOS..."
            className="flex-1 bg-transparent border-none outline-none text-base py-3 placeholder:text-slate-400 font-bold pr-14"
            dir="rtl"
          />
          
          {/* Upload Pin - WhatsApp style in Right Corner */}
          <div className="absolute right-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1, rotate: 12 }}
              whileTap={{ scale: 0.95 }}
              disabled={isUploadingDoc}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className={cn(
                "p-3 rounded-full transition-colors",
                isUploadingDoc ? "text-blue-500" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              )}
            >
              {isUploadingDoc ? <Loader2 size={22} className="animate-spin" /> : <Paperclip size={22} />}
            </motion.button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
              className="hidden" 
              accept="image/png,image/jpeg,application/pdf"
            />
          </div>

          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isUploadingDoc}
            className="size-12 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-all disabled:opacity-30 disabled:scale-95 shadow-lg shadow-slate-900/20"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
