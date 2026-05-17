import React, { useEffect, useState, useRef } from 'react';
import { cn } from '../lib/utils';
import { MapPin, Phone, Truck, Clock } from 'lucide-react';
import { STATUS_LABELS } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface OrderCardProps {
  order: any;
  onAction?: (type: string, payload: any) => void;
  className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onAction, className }) => {
  const [highlight, setHighlight] = useState(false);
  const prevStatus = useRef(order.status);

  useEffect(() => {
    if (order.status !== prevStatus.current) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      prevStatus.current = order.status;
      return () => clearTimeout(timer);
    }
  }, [order.status]);

  // V41 Robust Mapping Logic
  const items = Array.isArray(order.items) ? order.items : 
                (Array.isArray(order.productList) ? order.productList.map((p: string) => ({ productName: p })) : []);
  const itemsSummary = order.itemsSummary || (items.length > 0 ? `${items.length} פריטים` : "אין פריטים רשומים");
  
  const rawDate = order.dueDate || order.date || order.deliveryDate || order.updatedAt;
  let formattedDate = "טרם נקבע";
  let formattedTime = "--:--";
  
  if (rawDate) {
    const date = new Date(rawDate);
    if (!isNaN(date.getTime())) {
      formattedDate = date.toLocaleDateString('he-IL');
      formattedTime = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    }
  }

  return (
    <motion.div 
      animate={highlight ? { 
        scale: [1, 1.02, 1],
        boxShadow: ["0px 0px 0px rgba(234, 179, 8, 0)", "0px 0px 30px rgba(234, 179, 8, 0.4)", "0px 0px 0px rgba(234, 179, 8, 0)"]
      } : {}}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-slate-900 text-white rounded-2xl p-6 space-y-6 shadow-2xl border transition-all relative overflow-hidden text-right",
        order.specialOrder 
          ? "border-red-600/50 shadow-[0_0_25px_rgba(220,38,38,0.25)]" 
          : "border-slate-800",
        highlight ? "border-yellow-500 ring-2 ring-yellow-500/20" : "",
        className
      )}
    >
      {/* Structural Accents */}
      <div className="absolute top-0 right-0 w-1 h-full bg-yellow-500 opacity-50" />
      
      <div className="flex justify-between items-start relative z-10 gap-4 flex-row-reverse text-right">
        <div className="flex flex-col gap-1 flex-1 items-end">
          <div className="flex items-center gap-3 flex-row-reverse">
            <h3 className="text-sm font-black text-white tracking-wide">
              {order.customerName || 'לקוח לא ידוע'}
            </h3>
            <div className="flex items-center gap-1.5 text-yellow-500 font-black flex-row-reverse">
              <Clock size={14} strokeWidth={3} />
              <span className="text-base tracking-tighter">{formattedTime}</span>
              <span className="mx-0.5 opacity-30">|</span>
              <span className="text-[11px] font-bold">{formattedDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-row-reverse w-full">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">SABANOS Nexus</span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-slate-800 to-transparent" />
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 shrink-0">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/50">
            #ID-{order.id?.slice(-4).toUpperCase() || 'NEW'}
          </span>
          <div className={cn(
            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
            order.status === 'delivered' || order.status === 'סופק' ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
          )}>
            {STATUS_LABELS[order.status] || order.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1 flex-row-reverse">
            <div className="size-1.5 rounded-full bg-yellow-500" />
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-right">מניפסט פריטים</p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pl-1 pr-3 text-right">
            {Array.isArray(items) && items.length > 0 ? (
              items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg border border-white/5 group hover:bg-white/10 transition-colors flex-row-reverse">
                  <p className="text-xs font-bold text-slate-200">{item.productName || item}</p>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-[11px] font-black text-yellow-500">{item.quantity || ''}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{item.unit || 'יח\''}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-600 italic text-right">{itemsSummary}</p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1 flex-row-reverse">
              <div className="size-1.5 rounded-full bg-blue-500" />
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-right">יעד פריקה לוגיסטי</p>
            </div>
            <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl border border-slate-800 group hover:border-slate-700 transition-colors flex-row-reverse text-right">
              <div className="p-2 bg-yellow-500/10 rounded-lg shrink-0">
                <MapPin size={16} className="text-yellow-500" />
              </div>
              <p className="text-xs font-bold leading-relaxed text-slate-100 flex-1">{order.deliveryAddress || 'כתובת לא צוינה'}</p>
            </div>
          </div>
          
          <button 
            onClick={() => onAction?.('waze', { address: order.deliveryAddress })}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl border border-white/5 transition-all text-sm font-black"
          >
            <Truck size={16} />
            נווט עם WAZE
          </button>
        </div>
      </div>

      <div className="flex gap-4 pt-4 relative z-10 flex-row-reverse">
        <button 
          onClick={() => onAction?.('dispatch', { orderId: order.id })}
          className="flex-1 bg-yellow-500 text-slate-900 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-yellow-400 transition-all active:scale-95 shadow-xl shadow-yellow-500/20"
        >
          בצע שיבוץ/עדכון
        </button>
      </div>
    </motion.div>
  );
};
