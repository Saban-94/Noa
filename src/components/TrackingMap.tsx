import React, { useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Order, OrderStatus } from '../types';
import { Truck, MapPin, AlertCircle, Phone, Info } from 'lucide-react';
import { cn } from '../lib/utils';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== '' && API_KEY !== 'YOUR_API_KEY';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  status: string;
  currentLat?: number;
  currentLng?: number;
}

interface TrackingMapProps {
  orders: Order[];
  drivers: Driver[];
}

export const TrackingMap: React.FC<TrackingMapProps> = ({ orders, drivers }) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    type: 'order' | 'driver';
    id: string;
    position: { lat: number; lng: number };
    data: any;
  } | null>(null);

  if (!hasValidKey) {
    return (
      <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5 text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="text-yellow-500" size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">נדרש מפתח Google Maps</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            כדי להפעיל מעקב בזמן אמת, יש להוסיף מפתח API בהגדרות המערכת.
          </p>
        </div>
        <div className="text-[9px] text-slate-500 bg-black/30 p-3 rounded-lg text-right space-y-1 font-mono">
          <p>1. פתח Settings (⚙️)</p>
          <p>2. בחר Secrets</p>
          <p>3. הוסף GOOGLE_MAPS_PLATFORM_KEY</p>
        </div>
      </div>
    );
  }

  // Filter orders: non-delivered and has location
  const displayOrders = useMemo(() => orders.filter(o => 
    o.status !== OrderStatus.DELIVERED && o.status !== 'סופק' && o.lat && o.lng
  ), [orders]);

  // Default center (Israel context)
  const defaultCenter = { lat: 31.8, lng: 34.8 };

  const getDriverConfig = (id: string, name: string) => {
    const isAli = id === "ali" || name.includes("עלי");
    const isHikmat = id === "hikmat" || name.includes("חכמת");
    
    if (isAli) return { color: "bg-purple-600", size: 45, label: "משאית עלי (Priority)" };
    if (isHikmat) return { color: "bg-orange-500", size: 45, label: "מנוף חכמת (Heavy Load)" };
    return { color: "bg-blue-500", size: 35, label: name };
  };

  return (
    <div className="relative w-full h-[500px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-950 mt-2 mb-6">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={9}
          mapId="SABAN_TRACKING_V43_FINAL"
          colorScheme="DARK"
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Order Markers */}
          {displayOrders.map((order) => {
            const position = { lat: order.lat!, lng: order.lng! };
            const isPending = order.status === OrderStatus.PENDING || order.status === 'ממתין' || order.status === 'pending';
            
            return (
              <AdvancedMarker 
                key={`order-${order.id}`} 
                position={position}
                onClick={() => setActiveInfoWindow({
                  type: 'order',
                  id: order.id,
                  position,
                  data: order
                })}
              >
                <div className={cn(
                  "p-1.5 rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all hover:scale-125 cursor-pointer hover:z-50",
                  isPending ? "bg-yellow-500 text-slate-900" : "bg-blue-500 text-white"
                )}>
                  <MapPin size={18} strokeWidth={2.5} />
                  {isPending && <div className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full border border-white animate-pulse" />}
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Driver Markers */}
          {drivers.map((driver) => {
            if (!driver.currentLat || !driver.currentLng) return null;
            const position = { lat: driver.currentLat, lng: driver.currentLng };
            const config = getDriverConfig(driver.id, driver.name);

            return (
              <AdvancedMarker 
                key={`driver-${driver.id}`} 
                position={position}
                onClick={() => setActiveInfoWindow({
                  type: 'driver',
                  id: driver.id,
                  position,
                  data: driver
                })}
              >
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 animate-ping bg-white/20 rounded-full scale-110 opacity-75" />
                  <div 
                    style={{ width: config.size, height: config.size }}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl border-2 border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all hover:scale-110 text-white relative z-10",
                      config.color
                    )}
                  >
                    <Truck size={config.size * 0.5} strokeWidth={2.5} />
                    <div className="absolute -top-8 bg-slate-900/95 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                       <p className="text-[10px] font-black">{driver.name}</p>
                    </div>
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Info Window */}
          {activeInfoWindow && (
            <InfoWindow
              position={activeInfoWindow.position}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="p-4 min-w-[260px] text-right space-y-4 bg-white" dir="rtl">
                {activeInfoWindow.type === 'order' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">מזהה הזמנה</span>
                        <span className="text-xs font-mono font-black text-slate-800">#{activeInfoWindow.data.orderNumber || activeInfoWindow.id.toUpperCase().slice(-6)}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-sm border",
                        activeInfoWindow.data.status === 'pending' || activeInfoWindow.data.status === 'ממתין' 
                          ? "bg-yellow-50 text-yellow-600 border-yellow-200" 
                          : "bg-blue-50 text-blue-600 border-blue-200"
                      )}>
                        {activeInfoWindow.data.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">שם הלקוח</h4>
                      <p className="text-sm font-black text-slate-900 leading-tight">{activeInfoWindow.data.customerName}</p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">יעד פריקה</h4>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2 flex-row-reverse">
                        <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs font-bold text-slate-700 leading-relaxed text-right">{activeInfoWindow.data.destination || activeInfoWindow.data.deliveryAddress}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">מניפסט פריטים</h4>
                       <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[10px] text-slate-600 font-bold leading-tight max-h-[60px] overflow-y-auto">
                          {typeof activeInfoWindow.data.items === 'string' ? activeInfoWindow.data.items : 'פרטים במערכת'}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-orange-50 p-2 rounded-xl border border-orange-100">
                          <p className="text-[8px] font-black text-orange-400 uppercase mb-1">מועד הפצה</p>
                          <p className="text-[10px] font-black text-orange-700 tracking-tighter">
                            {activeInfoWindow.data.dueDate || activeInfoWindow.data.date || 'טרם נקבע'}
                          </p>
                       </div>
                       <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                          <p className="text-[8px] font-black text-blue-400 uppercase mb-1">נהג משויך</p>
                          <p className="text-[10px] font-black text-blue-700">
                            {activeInfoWindow.data.driverName || 'טרם שובץ'}
                          </p>
                       </div>
                    </div>

                    <button 
                      onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(activeInfoWindow.data.destination || activeInfoWindow.data.deliveryAddress)}`, '_blank')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      ניווט ליעד (Waze)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-3">
                       <div className={cn("size-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl", getDriverConfig(activeInfoWindow.data.id, activeInfoWindow.data.name).color)}>
                         {activeInfoWindow.data.name.charAt(0)}
                       </div>
                       <div className="text-right flex-1">
                         <h3 className="text-base font-black text-slate-900 tracking-tight">{activeInfoWindow.data.name}</h3>
                         <div className="flex items-center gap-2 justify-end">
                            <span className="size-2 bg-green-500 rounded-full animate-pulse" />
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest leading-none">מחובר ומנווט</p>
                         </div>
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                       <div className="flex justify-between items-center flex-row-reverse mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">מכשיר קשר</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">{activeInfoWindow.data.phone || 'לא ידוע'}</span>
                       </div>
                       <a href={`tel:${activeInfoWindow.data.phone}`} className="w-full py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-black text-xs">
                         <Phone size={14} className="text-green-500" />
                         <span>התקשר לנהג</span>
                       </a>
                    </div>
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Legend Overlay */}
      <div className="absolute top-4 left-4 bg-slate-950/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-3 z-10">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">מקרא תפעולי</h3>
        <div className="flex items-center gap-3 flex-row-reverse text-[10px] font-black text-slate-200">
          <div className="size-3 rounded-full bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]" />
          <span>ממתין (Pending)</span>
        </div>
        <div className="flex items-center gap-3 flex-row-reverse text-[10px] font-black text-slate-200">
          <div className="size-3 rounded-full bg-blue-500" />
          <span>משובץ לפריקה</span>
        </div>
        <div className="h-px bg-white/10 my-1"></div>
        <div className="flex items-center gap-3 flex-row-reverse text-[10px] font-black text-slate-200">
          <div className="size-4 rounded-lg bg-orange-500 ring-2 ring-white/20" />
          <span>חכמת (Heavy Duty)</span>
        </div>
        <div className="flex items-center gap-3 flex-row-reverse text-[10px] font-black text-slate-200">
          <div className="size-4 rounded-lg bg-purple-600 ring-2 ring-white/20" />
          <span>עלי (Express)</span>
        </div>
      </div>
    </div>
  );
};
