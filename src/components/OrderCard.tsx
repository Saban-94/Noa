import React from 'react';
import { cn } from '../lib/utils';
import { MapPin, Phone, Truck, Waze } from 'lucide-react';

interface OrderCardProps {
  order: any;
  onAction?: (type: string, payload: any) => void;
  className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onAction, className }) => {
  return (
    <div className={cn("bg-slate-900 text-white rounded-xl p-4 space-y-4 shadow-xl border border-slate-800 overflow-hidden relative", className)}>
      <div className="flex justify-between items-center relative z-10">
        <span className="text-[10px] font-black border-b border-yellow-500 uppercase tracking-widest text-slate-400">
          כרטיס פעולה: {order.customerName}
        </span>
        <span className="text-[10px] opacity-40 font-mono italic">#ID-{order.id.slice(-4).toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">פריטים</p>
          <div className="space-y-0.5">
            {order.items.slice(0, 2).map((item: any, idx: number) => (
              <p key={idx} className="text-xs font-bold leading-none">{item.productName} ({item.quantity})</p>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">סטטוס</p>
          <p className={cn(
            "text-xs font-black font-mono underline uppercase",
            order.status === 'pending' ? "text-amber-400" : "text-blue-400"
          )}>
            {order.status}
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2 relative z-10">
        <button 
          onClick={() => onAction?.('dispatch', { orderId: order.id })}
          className="flex-1 bg-yellow-500 text-slate-900 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-yellow-400 transition-all active:scale-95 shadow-lg shadow-yellow-500/20"
        >
          בצע שיבוץ עכשיו
        </button>
        <button 
          onClick={() => onAction?.('waze', { address: order.deliveryAddress })}
          className="px-4 border border-slate-700 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-500 transition-all"
        >
          Waze
        </button>
      </div>

      {/* Decorative BG element */}
      <div className="absolute -bottom-6 -right-6 size-24 bg-yellow-500/5 rounded-full blur-2xl" />
    </div>
  );
};
