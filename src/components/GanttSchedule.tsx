import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Calendar, History, ListFilter, MapPin, Package, Clock, Warehouse, ChevronDown, Map as MapIcon, Layers } from 'lucide-react';
import { Order, STATUS_LABELS } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingMap } from './TrackingMap';

interface GanttScheduleProps {
  orders: Order[];
  className?: string;
}

export const GanttSchedule: React.FC<GanttScheduleProps> = ({ orders, className }) => {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'סופק' && o.status !== 'cancelled');
  const historyOrders = orders.filter(o => o.status === 'delivered' || o.status === 'סופק' || o.status === 'cancelled');

  const displayOrders = (tab === 'active' ? activeOrders : historyOrders)
    .sort((a, b) => new Date(b.dueDate || b.date || b.createdAt).getTime() - new Date(a.dueDate || a.date || a.createdAt).getTime());

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (order: Order) => {
    const d = order.dueDate || order.date || order.deliveryDate;
    if (!d) return 'טרם נקבע';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return 'טרם נקבע';
      return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    } catch {
      return 'טרם נקבע';
    }
  };

  const formatTime = (order: Order) => {
    const d = order.dueDate || order.date || order.deliveryDate;
    if (!d) return 'טרם נקבע';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">
            {tab === 'active' ? 'סידור עבודה' : 'היסטוריית הזמנות'}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowMap(!showMap)}
              className={cn(
                "p-1.5 rounded-md transition-all border",
                showMap ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300"
              )}
            >
              <MapIcon size={14} />
            </button>
            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
              <button 
                onClick={() => setTab('active')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  tab === 'active' ? "bg-yellow-500 text-slate-900 shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <ListFilter size={14} />
              </button>
              <button 
                onClick={() => setTab('history')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  tab === 'history' ? "bg-yellow-500 text-slate-900 shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <History size={14} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showMap && activeOrders.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
               <TrackingMap orders={activeOrders} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        {displayOrders.map((order) => {
          const isDelivering = order.status === 'in_transit';
          const isScheduled = order.status === 'scheduled';
          const isDelivered = order.status === 'delivered' || order.status === 'סופק';
          const isExpanded = expandedId === order.id;
          
          return (
            <motion.div 
              key={order.id} 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => toggleExpand(order.id)}
              className={cn(
                "border-r-4 rounded-xl transition-all cursor-pointer overflow-hidden group text-right",
                isDelivering ? "bg-slate-800 border-blue-500 shadow-[0_4px_25px_-5px_rgba(59,130,246,0.4)]" : 
                isScheduled ? "bg-slate-800/50 border-yellow-500 shadow-[0_4px_15px_-5px_rgba(234,179,8,0.2)]" :
                isDelivered ? "bg-slate-800/10 border-green-500 opacity-60" :
                "bg-slate-800/20 border-slate-700",
                isExpanded ? "p-0" : "p-4"
              )}
            >
              <AnimatePresence mode="wait">
                {!isExpanded ? (
                  <motion.div 
                    key="collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2"
                  >
                  <div className="flex justify-between items-start flex-row-reverse text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-yellow-500 font-black text-xs flex-row-reverse">
                        <Clock size={12} strokeWidth={3} />
                        <span className="text-sm tracking-tighter">
                          {formatTime(order)}
                        </span>
                        <span className="mx-0.5 opacity-30">|</span>
                        <span className="text-[10px]">
                          {formatDate(order)}
                        </span>
                      </div>
                      <p className="font-black text-white text-[13px] tracking-tight truncate mt-0.5 w-full">
                        {order.customerName}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                       <span className="text-[8px] font-mono text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                         #{order.id.slice(-4).toUpperCase()}
                       </span>
                       <div className={cn(
                         "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                         isDelivering ? "bg-blue-500/20 text-blue-400" :
                         isScheduled ? "bg-yellow-500/20 text-yellow-500" :
                         "bg-slate-700 text-slate-400"
                       )}>
                         {STATUS_LABELS[order.status] || order.status}
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold flex-row-reverse">
                    <MapPin size={10} />
                    <span className="truncate">{order.deliveryAddress}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="expanded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 space-y-4"
                >
                  <div className="flex justify-between items-start flex-row-reverse">
                    <div className="text-right">
                      <h3 className="text-sm font-black text-white mb-1">{order.customerName}</h3>
                      <p className="text-[10px] font-mono text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded inline-block">
                        ORDER #{order.id.toUpperCase()}
                      </p>
                    </div>
                    <button className="p-1 px-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                      <ChevronDown size={16} className="rotate-180" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-right">
                      <p className="text-slate-500 font-black uppercase mb-1 flex items-center justify-end gap-1">
                        תזמון <Clock size={10} />
                      </p>
                      <p className="font-bold text-white">
                        {formatDate(order)} | {formatTime(order)}
                      </p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-right">
                      <p className="text-slate-500 font-black uppercase mb-1 flex items-center justify-end gap-1">
                        מקור <Warehouse size={10} />
                      </p>
                      <p className="font-bold text-white truncate">מחסן מרכזי ח.סבן</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center justify-end gap-2">
                      מניפסט חומרים <Package size={12} />
                    </p>
                    <div className="space-y-1">
                      {Array.isArray(order.items) && order.items.length > 0 ? order.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5 flex-row-reverse">
                          <span className="text-xs font-bold text-slate-200">{item.productName}</span>
                          <span className="text-xs font-black text-yellow-500">{item.quantity} {item.unit}</span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-slate-600 italic">אין פריטים רשומים</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-600/20 text-right">
                     <p className="text-[10px] text-blue-400 font-black uppercase mb-1">יעד פריקה</p>
                     <p className="text-xs font-bold text-slate-300 leading-relaxed">{order.deliveryAddress}</p>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {displayOrders.length === 0 && (
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-10 opacity-30 italic">
            רשימה ריקה
          </div>
        )}
      </div>
    </div>
  );
};

