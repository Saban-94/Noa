import React, { useEffect, useState, useRef } from 'react';
import { cn } from '../lib/utils';
import { MapPin, Phone, Truck, Clock, Box, Shield, Hash, FileText, ChevronLeft, Paperclip } from 'lucide-react';
import { STATUS_LABELS } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentUploader } from './DocumentUploader';

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

  // V44 Warehouse Optimized Layout
  const items = Array.isArray(order.items) ? order.items : [];
  const stringItems = typeof order.items === 'string' ? order.items : null;
  
  const rawDate = order.dueDate || order.date || order.deliveryDate || order.updatedAt;
  let formattedDate = "טרם נקבע";
  
  if (rawDate) {
    const dateObj = rawDate?.toDate ? rawDate.toDate() : (rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate));
    if (!isNaN(dateObj.getTime())) {
      formattedDate = dateObj.toLocaleDateString('he-IL');
    }
  }

  // Absolute Time Fidelity (FIXING THE 03:00 BUG)
  const renderDeliveryTime = () => {
    const rawTime = order.time ? String(order.time).trim() : '';
    if (rawTime && rawTime !== '03:00' && rawTime !== '3:00' && rawTime !== '03:00:00') {
      return rawTime;
    }
    const dateStr = order.date || order.dueDate || order.deliveryDate;
    const rawDateStr = dateStr ? String(dateStr).trim() : '';
    if (rawDateStr.includes(' ')) {
      const parts = rawDateStr.split(' ');
      const timePart = parts.find(p => p.includes(':'));
      if (timePart && timePart !== '03:00' && timePart !== '3:00') {
        return timePart;
      }
    }
    return '07:00';
  };

  const formattedTime = renderDeliveryTime();
  const finalDestination = order.destination || order.deliveryAddress || 'כתובת לא צוינה';
  
  const getDriverLabel = () => {
    if (!order.driverId || order.driverId === 'unassigned') return "ממתין לשיבוץ";
    if (order.driverId === 'self') return "איסוף עצמי";
    if (order.driverId === 'hikmat') return "חכמת (מנוף 🏗️)";
    if (order.driverId === 'ali') return "עלי (משאית 🚛)";
    return order.driverName || "נהג לא ידוע";
  };

  const originWarehouse = order.warehouse === 'the_student' ? "התלמיד" : "החרש";

  return (
    <motion.div 
      whileHover={{ scale: 1.015, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={() => onAction?.('view_order_details', { id: order.id, orderNumber: order.orderNumber })}
      animate={highlight ? { 
        scale: [1, 1.01, 1],
        boxShadow: ["0px 0px 0px rgba(234, 179, 8, 0)", "0px 0px 40px rgba(234, 179, 8, 0.3)", "0px 0px 0px rgba(234, 179, 8, 0)"]
      } : {}}
      className={cn(
        "bg-white rounded-[2.5rem] p-8 space-y-8 shadow-[0_10px_50px_rgba(0,0,0,0.05)] border-2 transition-all relative overflow-hidden text-right cursor-pointer",
        order.specialOrder ? "border-red-500/20 bg-red-50/10" : "border-slate-200 hover:border-slate-300/80 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
        highlight ? "border-yellow-500" : "",
        className
      )}
      dir="rtl"
    >
      {/* Visual Identity Decor */}
      <div className={cn(
        "absolute top-0 right-0 w-3 h-full",
        order.specialOrder ? "bg-red-500" : "bg-blue-600"
      )} />
      
      {/* Header Implementation */}
      <div className="flex justify-between items-start gap-6">
        <div className="flex-1 space-y-2">
           <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {order.customerName || 'לקוח לא ידוע'}
              </h3>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                order.status === 'delivered' || order.status === 'סופק' 
                  ? "bg-emerald-100 text-emerald-700" 
                  : "bg-blue-100 text-blue-700"
              )}>
                {STATUS_LABELS[order.status] || order.status}
              </div>
           </div>
           
           <div className="flex items-center gap-4 text-slate-500">
              <a 
                href={`tel:${order.customerPhone}`} 
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 hover:text-emerald-600 transition-colors"
              >
                 <Phone size={16} className="text-emerald-500" />
                 <span className="text-sm font-bold">{order.customerPhone || 'ללא מספר'}</span>
              </a>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-2">
                 <Hash size={16} className="text-slate-400" />
                 <span className="text-sm font-black text-slate-800">הזמנה #{order.orderNumber || '---'}</span>
                 {order.leadNumber && (
                   <span className="text-[10px] font-black bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-lg border border-yellow-200">ליד: {order.leadNumber}</span>
                 )}
              </div>
           </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center min-w-[120px] shadow-inner">
           <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
              <Clock size={18} strokeWidth={3} />
              <span className="text-xl font-black tracking-tighter leading-none">{formattedTime}</span>
           </div>
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{formattedDate}</p>
        </div>
      </div>

      {/* Info Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Right Section: Logistics */}
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                 <div className="flex items-center gap-2 mb-2">
                    <Truck size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">נהג משובץ</span>
                 </div>
                 <p className="text-sm font-black text-slate-800">{getDriverLabel()}</p>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                 <div className="flex items-center gap-2 mb-2">
                    <Box size={14} className="text-yellow-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מחסן יציאה</span>
                 </div>
                 <p className="text-sm font-black text-slate-800">{originWarehouse}</p>
              </div>
           </div>

           <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                 <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">מזהי מסמכים</span>
                 </div>
                 <DocumentUploader 
                    orderId={order.id} 
                    onUploadComplete={(result) => onAction?.('update_order_from_ai', { orderId: order.id, aiData: result.data, driveUrl: result.driveUrl })}
                 />
              </div>
              <div className="flex flex-wrap gap-2">
                 {order.invoiceNumber ? (
                   <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
                      <span className="size-2 bg-emerald-500 rounded-full" />
                      <span className="text-xs font-black text-slate-700">חשבונית {order.invoiceNumber}</span>
                   </div>
                 ) : (
                   <span className="text-xs font-bold text-slate-400 italic">ממתין להפקת חשבונית</span>
                 )}
                 {order.deliveryNote && (
                   <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
                      <span className="size-2 bg-blue-500 rounded-full" />
                      <span className="text-xs font-black text-slate-700">ת.משלוח {order.deliveryNote}</span>
                   </div>
                 )}
              </div>
           </div>

           <div className="space-y-3">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pr-2">פירוט פריטים (מניפסט)</h4>
              <div className="bg-slate-900 rounded-[2rem] p-6 text-white min-h-[140px] shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 pointer-events-none" />
                 <div className="space-y-3 relative z-10 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {stringItems ? (
                      <p className="text-sm font-bold leading-relaxed">{stringItems}</p>
                    ) : items.length > 0 ? (
                      items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5 transition-all hover:bg-white/10 group">
                           <span className="text-sm font-bold text-slate-200">{item.productName || item}</span>
                           <div className="flex items-center gap-3">
                              <span className="text-lg font-black text-yellow-500 leading-none">{item.quantity || 1}</span>
                              <span className="text-[10px] font-black uppercase text-slate-500">{item.unit || 'יח\''}</span>
                           </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 italic">לא הוזנו פריטים להזמנה זו</p>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* Left Section: Routing & Actions */}
        <div className="space-y-8">
           <div className="space-y-4">
              <div className="flex items-center justify-between pr-2">
                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">יעד לאספקה</span>
                 <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://waze.com/ul?q=${encodeURIComponent(finalDestination)}`, '_blank');
                  }}
                  className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all"
                 >
                   פתח ב-WAZE
                 </button>
              </div>
              <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 group transition-all hover:shadow-lg hover:border-blue-200">
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl group-hover:scale-110 transition-all">
                       <MapPin size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-base font-black text-slate-800 leading-snug pt-1">{finalDestination}</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://waze.com/ul?q=${encodeURIComponent(finalDestination)}`, '_blank');
                }}
                className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-blue-500 hover:shadow-xl p-6 rounded-[2rem] transition-all group"
              >
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                   <Truck size={24} />
                </div>
                <span className="text-xs font-black text-slate-600 group-hover:text-slate-900">ניווט WAZE</span>
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (order.customerPhone) window.location.href = `tel:${order.customerPhone}`;
                  else alert('מספר טלפון חסר');
                }}
                className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl p-6 rounded-[2rem] transition-all group"
              >
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                   <Phone size={24} />
                </div>
                <span className="text-xs font-black text-slate-600 group-hover:text-slate-900">התקשר ללקוח</span>
              </button>
           </div>

           <div className="pt-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.('dispatch', { orderId: order.id });
                }}
                className="w-full bg-slate-900 hover:bg-slate-950 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] flex items-center justify-center gap-4 group"
              >
                <Shield size={20} className="text-yellow-500 group-hover:rotate-12 transition-transform" /> 
                שינוי שיבוץ / עדכון סטטוס
                <ChevronLeft size={20} className="animate-pulse" />
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
