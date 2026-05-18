import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { Calendar, History, ListFilter, MapPin, Package, Clock, Warehouse, ChevronDown, Map as MapIcon, Layers, User, Truck } from 'lucide-react';
import { Order, STATUS_LABELS } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingMap } from './TrackingMap';

interface GanttScheduleProps {
  orders: Order[];
  drivers: any[];
  showMap?: boolean;
  setShowMap?: (show: boolean) => void;
  className?: string;
}

export const GanttSchedule: React.FC<GanttScheduleProps> = ({ 
  orders, 
  drivers, 
  showMap = true, 
  setShowMap, 
  className 
}) => {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'delivered' && o.status !== 'סופק' && o.status !== 'cancelled'), [orders]);
  const historyOrders = useMemo(() => orders.filter(o => o.status === 'delivered' || o.status === 'סופק' || o.status === 'cancelled'), [orders]);

  // Group active orders by driver - architecture updated for Firestore mapping
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    
    // Initialize groups for all known drivers using their IDs as keys
    drivers.forEach(d => {
      groups[d.id] = [];
    });
    
    // Add "Unassigned" bucket
    groups['unassigned'] = [];

    activeOrders.forEach(order => {
      const dId = order.driverId || 'unassigned';
      if (!groups[dId]) groups[dId] = [];
      groups[dId].push(order);
    });
    
    return groups;
  }, [activeOrders, drivers]);

  const displayOrders = (tab === 'active' ? activeOrders : historyOrders)
    .sort((a, b) => {
      const parseDate = (d: any) => {
        if (!d) return 0;
        if (d.toDate) return d.toDate().getTime();
        if (d.seconds) return d.seconds * 1000;
        const date = new Date(d);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      };
      return parseDate(b.dueDate || b.date || b.createdAt) - parseDate(a.dueDate || a.date || a.createdAt);
    });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (order: Order) => {
    const d: any = order.dueDate || order.date || order.deliveryDate;
    if (!d) return 'טרם נקבע';
    try {
      const date = d.toDate ? d.toDate() : (d.seconds ? new Date(d.seconds * 1000) : new Date(d));
      if (isNaN(date.getTime())) return 'טרם נקבע';
      return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    } catch {
      return 'טרם נקבע';
    }
  };

  const formatTime = (order: Order) => {
    const d: any = order.dueDate || order.date || order.deliveryDate;
    if (!d) return 'טרם נקבע';
    try {
      const date = d.toDate ? d.toDate() : (d.seconds ? new Date(d.seconds * 1000) : new Date(d));
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className={cn("space-y-6", className)} dir="rtl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">
            {tab === 'active' ? 'סידור עבודה פעיל' : 'ארכיון הפצות'}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowMap?.(!showMap)}
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
                  "p-1.5 px-3 rounded-md transition-all text-[10px] font-black uppercase",
                  tab === 'active' ? "bg-yellow-500 text-slate-900 shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                פעיל
              </button>
              <button 
                onClick={() => setTab('history')}
                className={cn(
                  "p-1.5 px-3 rounded-md transition-all text-[10px] font-black uppercase",
                  tab === 'history' ? "bg-yellow-500 text-slate-900 shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                ארכיון
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
               <TrackingMap orders={activeOrders} drivers={drivers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-8">
        {tab === 'active' ? (
          (Object.entries(groupedOrders) as [string, Order[]][]).map(([driverId, driverOrders]) => {
            const driver = drivers.find(d => d.id === driverId);
            const driverName = driver?.name || (driverId === 'unassigned' ? 'טרם שובץ' : driverId);
            const avatarUrl = driver?.avatarUrl || driver?.photoURL;
            
            // User requested load count: orders.filter(o => o.driverId === driver.id && o.status !== 'delivered').length
            // Our driverOrders already contains active orders for this driverId
            const loadCount = driverOrders.length;
            
            return (
              <div key={driverId} className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 group">
                   <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="size-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-sm text-yellow-500 shadow-xl overflow-hidden ring-2 ring-white/5 tracking-tighter">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={driverName} className="w-full h-full object-cover" />
                          ) : (
                            driverName.charAt(0)
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 size-4 bg-green-500 rounded-full border-2 border-slate-900 shadow-lg" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white hover:text-yellow-500 transition-colors cursor-default">{driverName}</span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">צוות הפצה פעיל</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">עומס קריאות</span>
                        <span className={cn(
                          "text-xs font-black px-3 py-1 rounded-full border transition-all shadow-inner",
                          loadCount > 3 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}>
                           {loadCount} הפצות
                        </span>
                      </div>
                   </div>
                </div>
                <div className="grid gap-4">
                  {driverOrders.map(order => renderOrderCard(order, expandedId === order.id, toggleExpand))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid gap-3">
             {displayOrders.map(order => renderOrderCard(order, expandedId === order.id, toggleExpand))}
          </div>
        )}

        
        {displayOrders.length === 0 && (
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-10 opacity-30 italic">
            רשימה ריקה
          </div>
        )}
      </div>
    </div>
  );

  function renderOrderCard(order: Order, isExpanded: boolean, onToggle: (id: string) => void) {
    const isDelivering = order.status === 'in_transit';
    const isScheduled = order.status === 'scheduled' || order.status === 'מתוזמן';
    const isDelivered = order.status === 'delivered' || order.status === 'סופק';
    
    return (
      <motion.div 
        key={order.id} 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onToggle(order.id)}
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
                <div className="flex items-center gap-1.5 text-yellow-500 font-black flex-row-reverse">
                  <Clock size={14} strokeWidth={3} />
                  <span className="text-base tracking-tighter">
                    {formatTime(order)}
                  </span>
                  <span className="mx-0.5 opacity-30">|</span>
                  <span className="text-[11px] font-bold">
                    {formatDate(order)}
                  </span>
                </div>
                <p className="font-black text-white text-[13px] tracking-tight truncate mt-0.5 w-full">
                  {order.customerName}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1">
                 <span className="text-[8px] font-mono text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                   #{order.orderNumber || order.id.slice(-4).toUpperCase()}
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
              <span className="truncate">{order.destination || order.deliveryAddress}</span>
            </div>
            {order.driverName && (
               <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-black uppercase mt-1 justify-end">
                 <span>משויך ל: {order.driverName}</span>
                 <Truck size={10} />
               </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 space-y-5"
          >
            <div className="flex justify-between items-start flex-row-reverse">
              <div className="text-right">
                <h3 className="text-sm font-black text-white mb-1">{order.customerName}</h3>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-[10px] font-mono text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded inline-block">
                    ORDER #{order.orderNumber || order.id.toUpperCase()}
                  </p>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                    isDelivering ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400"
                  )}>
                    {order.status}
                  </span>
                </div>
              </div>
              <button className="p-1 px-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                <ChevronDown size={16} className="rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-right">
                <p className="text-slate-500 font-black uppercase mb-1 flex items-center justify-end gap-1">
                  תזמון הפצה <Clock size={10} />
                </p>
                <p className="font-bold text-white">
                  {formatTime(order)} | {formatDate(order)}
                </p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-right">
                <p className="text-slate-500 font-black uppercase mb-1 flex items-center justify-end gap-1">
                  מקור איסוף <Warehouse size={10} />
                </p>
                <p className="font-bold text-white truncate">מחסן מרכזי ח.סבן</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest flex items-center justify-end gap-2 border-b border-white/5 pb-2">
                מניפסט חומרים מפורט <Package size={12} className="text-yellow-500" />
              </p>
              <div className="grid gap-1.5">
                {typeof order.items === 'string' ? (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-right">
                    <span className="text-xs font-bold text-slate-200 leading-relaxed block">{order.items}</span>
                  </div>
                ) : Array.isArray(order.items) && order.items.length > 0 ? (
                  order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-lg border border-white/5 flex-row-reverse group hover:bg-white/10 transition-colors">
                      <span className="text-xs font-bold text-slate-200">{item.productName}</span>
                      <span className="text-xs font-black text-yellow-500">{item.quantity} {item.unit}</span>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-900/50 p-4 rounded-xl text-center border border-dashed border-white/10">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">אין פריטים רשומים במניפסט</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-600/20 text-right space-y-2">
               <div className="flex justify-between items-center flex-row-reverse">
                 <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">יעד פריקה סופי</p>
                 <MapPin size={12} className="text-blue-500" />
               </div>
               <p className="text-sm font-bold text-slate-100 leading-relaxed">{order.destination || order.deliveryAddress}</p>
            </div>

            {order.driverName && (
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 justify-end">
                 <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-black uppercase">נהג אחראי</p>
                    <p className="text-xs font-black text-white">{order.driverName}</p>
                 </div>
                 <div className="size-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                    <User size={18} className="text-yellow-500" />
                 </div>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    );
  }
};


