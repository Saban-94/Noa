import React from 'react';
import { cn } from '../lib/utils';
import { Calendar } from 'lucide-react';
import { Order } from '../types';

interface GanttScheduleProps {
  orders: Order[];
  className?: string;
}

export const GanttSchedule: React.FC<GanttScheduleProps> = ({ orders, className }) => {
  // Simple simulation of a vertical schedule
  const sortedOrders = [...orders].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">הזמנות פעילות</h2>
      <div className="space-y-2">
        {sortedOrders.map((order, idx) => {
          const isDelivering = order.status === 'in_transit';
          const isScheduled = order.status === 'scheduled';
          
          return (
            <div 
              key={idx} 
              className={cn(
                "p-3 border-r-2 rounded transition-all cursor-pointer hover:bg-slate-800/80 group",
                isDelivering ? "bg-slate-800 border-blue-500 shadow-[inset_-4px_0_10px_-5px_rgba(59,130,246,0.3)]" : 
                isScheduled ? "bg-slate-800/50 border-yellow-500" :
                "bg-slate-800/20 border-slate-700"
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <p className="font-bold text-white text-[11px] tracking-tight truncate">
                  #{order.id.slice(-4).toUpperCase()} - {order.customerName.split(' ')[0]}
                </p>
                {isDelivering && <div className="size-1.5 bg-blue-500 rounded-full animate-pulse" />}
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate leading-none">
                {Array.isArray(order.items) ? order.items.map(i => i.productName).join(', ') : 'אין פריטים'}
              </p>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-10 opacity-30 italic">
            אין הזמנות פעילות
          </div>
        )}
      </div>
    </div>
  );
};
