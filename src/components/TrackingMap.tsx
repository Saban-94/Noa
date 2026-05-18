import React, { useState, useMemo, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { Order, OrderStatus } from '../types';
import { Truck, MapPin, AlertCircle, Phone, Info, Box, Clock, Shield } from 'lucide-react';
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

const Clusterer = ({ orders, onMarkerClick }: { orders: Order[], onMarkerClick: (order: Order) => void }) => {
  const map = useMap();
  const [markers, setMarkers] = useState<{[key: string]: google.maps.marker.AdvancedMarkerElement}>({});
  const clusterer = useRef<MarkerClusterer | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({ 
        map,
        algorithm: new SuperClusterAlgorithm({ radius: 60 }),
        renderer: {
          render: ({ count, position }, stats, map) => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-center size-12 rounded-full border-4 border-white/60 bg-yellow-500/90 text-slate-950 font-black text-sm shadow-[0_10px_30px_rgba(234,179,8,0.5)] backdrop-blur-md cursor-pointer transition-all hover:scale-110 active:scale-95";
            div.innerHTML = `<span class="mt-0.5">${count}</span>`;
            
            const clusterMarker = new google.maps.marker.AdvancedMarkerElement({
              position,
              content: div,
              zIndex: 1000 + count,
            });

            clusterMarker.addListener('click', () => {
              map.setCenter(position);
              map.setZoom(map.getZoom()! + 2);
            });

            return clusterMarker;
          }
        }
      });
    }
  }, [map]);

  useEffect(() => {
    if (!clusterer.current || !map) return;
    
    // Track markers to add and remove
    const newMarkersList: google.maps.marker.AdvancedMarkerElement[] = [];
    const updatedMarkers: {[key: string]: google.maps.marker.AdvancedMarkerElement} = {};

    orders.forEach(order => {
      if (markers[order.id]) {
        updatedMarkers[order.id] = markers[order.id];
        return;
      }
      
      const isPending = order.status === OrderStatus.PENDING || order.status === 'ממתין' || order.status === 'pending';
      const driverType = order.driverId === 'hikmat' ? 'crane' : order.driverId === 'ali' ? 'truck' : order.driverId === 'self' ? 'self' : 'unassigned';
      
      const content = document.createElement('div');
      content.className = cn(
        "p-1.5 rounded-full border-2 border-white shadow-[0_5px_15px_rgba(0,0,0,0.4)] transition-all hover:scale-125 cursor-pointer z-20",
        driverType === 'crane' ? "bg-orange-500 text-white" :
        driverType === 'truck' ? "bg-purple-600 text-white" :
        driverType === 'self' ? "bg-emerald-500 text-white" :
        isPending ? "bg-yellow-500 text-slate-900" : "bg-blue-500 text-white"
      );
      content.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: order.lat!, lng: order.lng! },
        content,
      });

      marker.addListener('click', () => onMarkerClick(order));
      newMarkersList.push(marker);
      updatedMarkers[order.id] = marker;
    });

    // Remove old markers
    Object.keys(markers).forEach(id => {
      if (!updatedMarkers[id]) {
        clusterer.current?.removeMarker(markers[id]);
      }
    });

    clusterer.current.addMarkers(newMarkersList);
    setMarkers(updatedMarkers);
  }, [orders, map]);

  return null;
};

export const TrackingMap: React.FC<TrackingMapProps> = ({ orders, drivers }) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    type: 'order' | 'driver';
    id: string;
    position: { lat: number; lng: number };
    data: any;
  } | null>(null);

  if (!hasValidKey) {
    return (
      <div className="bg-slate-900/50 rounded-[2.5rem] p-10 border border-white/5 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-yellow-500/10 rounded-full animate-pulse">
            <AlertCircle className="text-yellow-500" size={48} />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-black text-white uppercase tracking-wider">נדרש מפתח Google Maps</h3>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            כדי להפעיל מעקב לוגיסטי בזמן אמת וניתוח צפיפות, יש להגדיר מפתח API במערכת.
          </p>
        </div>
        <div className="text-[11px] text-slate-500 bg-black/40 p-5 rounded-3xl text-right space-y-2 font-mono border border-white/5 max-w-sm mx-auto">
          <p>1. פתח Settings (⚙️)</p>
          <p>2. בחר Secrets</p>
          <p>3. הוסף GOOGLE_MAPS_PLATFORM_KEY</p>
        </div>
      </div>
    );
  }

  const displayOrders = useMemo(() => orders.filter(o => 
    o.status !== OrderStatus.DELIVERED && o.status !== 'סופק' && o.lat && o.lng
  ), [orders]);

  const defaultCenter = { lat: 31.8, lng: 34.8 };

  const getDriverConfig = (id: string, name: string) => {
    const isAli = id === "ali" || name.includes("עלי");
    const isHikmat = id === "hikmat" || name.includes("חכמת");
    
    if (isAli) return { color: "bg-purple-600", size: 48, label: "עלי (משאית 🚛)" };
    if (isHikmat) return { color: "bg-orange-500", size: 48, label: "חכמת (מנוף 🏗️)" };
    return { color: "bg-blue-500", size: 38, label: name };
  };

  const renderFidelityTime = (order: any) => {
    const rawTime = order.time ? String(order.time).trim() : '';
    if (rawTime && !rawTime.includes('03:00') && !rawTime.includes('3:00')) return rawTime;
    const dateStr = order.date || order.dueDate || order.deliveryDate;
    const rawDateStr = dateStr ? String(dateStr).trim() : '';
    if (rawDateStr.includes(' ')) {
      const parts = rawDateStr.split(' ');
      const timePart = parts.find(p => p.includes(':'));
      if (timePart && !timePart.includes('03:00') && !timePart.includes('3:00')) return timePart;
    }
    return '07:00';
  };

  return (
    <div className="relative w-full h-[650px] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] bg-slate-950 mt-6 mb-10 group">
      <APIProvider apiKey={API_KEY} version="weekly" language="iw">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={9}
          mapId="SABAN_TRACKING_V44_ULTRA"
          colorScheme="DARK"
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          <Clusterer 
            orders={displayOrders} 
            onMarkerClick={(order) => {
              setActiveInfoWindow({
                type: 'order',
                id: order.id,
                position: { lat: order.lat!, lng: order.lng! },
                data: order
              });
            }}
          />

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
                <div className="relative group/driver cursor-pointer z-[100]">
                  <div className="absolute inset-0 animate-ping bg-white/30 rounded-full scale-150 opacity-50 transition-opacity group-hover/driver:opacity-0" />
                  <div 
                    style={{ width: config.size, height: config.size }}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-[1.4rem] border-[3px] border-white/90 shadow-[0_15px_40px_rgb(0,0,0,0.7)] transition-all hover:scale-115 text-white relative z-10",
                      config.color
                    )}
                  >
                    <Truck size={config.size * 0.5} strokeWidth={2.5} />
                    <div className="absolute -top-12 bg-slate-900 border border-white/20 px-4 py-1.5 rounded-2xl shadow-2xl opacity-0 group-hover/driver:opacity-100 transition-all scale-90 group-hover/driver:scale-100 whitespace-nowrap backdrop-blur-xl">
                       <p className="text-xs font-black text-white">{driver.name}</p>
                    </div>
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {activeInfoWindow && (
            <InfoWindow
              position={activeInfoWindow.position}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="p-6 min-w-[340px] text-right space-y-6 bg-white rounded-[2rem] shadow-3xl" dir="rtl">
                {activeInfoWindow.type === 'order' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                      <div className="flex flex-col text-right gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">מזהה הזמנה / ליד</span>
                        <div className="flex items-center gap-2 flex-row-reverse">
                           <span className="text-lg font-black text-slate-800 tracking-tight">#{activeInfoWindow.data.orderNumber || '--'}</span>
                           {activeInfoWindow.data.leadNumber && (
                             <span className="text-[10px] font-black bg-yellow-500 text-slate-950 px-2.5 py-1 rounded-lg shadow-sm">L:{activeInfoWindow.data.leadNumber}</span>
                           )}
                        </div>
                      </div>
                      <div className={cn(
                        "text-[10px] font-black px-4 py-2 rounded-full uppercase shadow-md border-2",
                        activeInfoWindow.data.status === 'pending' || activeInfoWindow.data.status === 'ממתין' || activeInfoWindow.data.status === 'pending'
                          ? "bg-yellow-50 text-yellow-600 border-yellow-200" 
                          : "bg-blue-50 text-blue-600 border-blue-200"
                      )}>
                        {activeInfoWindow.data.status === 'pending' ? 'ממתין לביצוע' : activeInfoWindow.data.status}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 px-1">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">לקוח וקשר</h4>
                      <div className="flex flex-col items-end">
                         <p className="text-xl font-black text-slate-900 tracking-tight leading-tight">{activeInfoWindow.data.customerName}</p>
                         <a href={`tel:${activeInfoWindow.data.customerPhone}`} className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors mt-1">
                            {activeInfoWindow.data.customerPhone || 'ללא מספר'}
                            <Phone size={14} />
                         </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 relative overflow-hidden group/box">
                          <div className="absolute top-0 right-0 w-1 h-full bg-yellow-500/30" />
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">תזמון אספקה</p>
                          <div className="flex items-center gap-2 justify-end text-slate-800">
                             <Clock size={16} className="text-yellow-600 group-hover/box:rotate-12 transition-transform" />
                             <div className="flex flex-col items-end">
                                <span className="text-sm font-black tracking-tighter leading-none">{renderFidelityTime(activeInfoWindow.data)}</span>
                                <span className="text-[10px] font-bold opacity-60 mt-1">{activeInfoWindow.data.dueDate || activeInfoWindow.data.date?.split(' ')[0] || '---'}</span>
                             </div>
                          </div>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 relative overflow-hidden group/box">
                          <div className="absolute top-0 right-0 w-1 h-full bg-blue-500/30" />
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">מחסן יציאה</p>
                          <div className="flex items-center gap-2 justify-end text-slate-800">
                             <Box size={16} className="text-blue-600 group-hover/box:scale-110 transition-transform" />
                             <span className="text-sm font-black">{activeInfoWindow.data.warehouse === 'the_student' ? 'התלמיד' : 'החרש'}</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-1">פירוט פריטים במניפסט</h4>
                       <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-xs font-bold text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar shadow-inner">
                          {activeInfoWindow.data.items && Array.isArray(activeInfoWindow.data.items) ? (
                            activeInfoWindow.data.items.map((it:any, idx:number) => (
                              <div key={idx} className="border-b border-white/5 py-2 last:border-0 flex justify-between items-center flex-row-reverse">
                                 <span className="text-white">{it.productName || it}</span>
                                 <span className="text-yellow-500 font-black">x{it.quantity || 1}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic">{activeInfoWindow.data.items || 'אין פירוט פריטים רשום'}</p>
                          )}
                       </div>
                    </div>

                    <div className="pt-2">
                       <button 
                         onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(activeInfoWindow.data.destination || activeInfoWindow.data.deliveryAddress)}`, '_blank')}
                         className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.4rem] font-black text-sm transition-all shadow-[0_15px_35px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95"
                       >
                         <Truck size={18} /> ניווט ליעד עם WAZE
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-5 border-b border-slate-100 pb-5">
                       <div className={cn("size-16 rounded-[1.6rem] flex items-center justify-center text-white font-black text-3xl shadow-3xl", getDriverConfig(activeInfoWindow.data.id, activeInfoWindow.data.name).color)}>
                         {activeInfoWindow.data.name.charAt(0)}
                       </div>
                       <div className="text-right flex-1">
                         <h3 className="text-xl font-black text-slate-900 tracking-tight">{activeInfoWindow.data.name}</h3>
                         <div className="flex items-center gap-2 justify-end mt-1.5">
                            <span className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">מחובר - ניווט פעיל</p>
                         </div>
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-[2.2rem] border border-slate-200">
                       <div className="flex justify-between items-center flex-row-reverse mb-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">מכשיר קשר</span>
                          <span className="text-sm font-mono font-black text-slate-800 tracking-wide">{activeInfoWindow.data.phone || 'לא ידוע'}</span>
                       </div>
                       <a href={`tel:${activeInfoWindow.data.phone}`} className="w-full py-4 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg font-black text-sm group">
                         <Phone size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
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

      {/* High-Contrast Light Legent Overlay */}
      <div className="absolute top-8 left-8 bg-white/95 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-slate-200/50 shadow-[0_25px_60px_rgba(0,0,0,0.15)] flex flex-col gap-5 z-10 min-w-[200px]">
        <div className="space-y-1">
           <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.25em]">SABAN OS LOGS</h3>
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">מקרא תפעולי V4.4</p>
        </div>
        <div className="space-y-5">
          <div className="flex items-center gap-4 flex-row-reverse text-xs font-black text-slate-800 group/item">
            <div className="size-5 rounded-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] border-2 border-white ring-2 ring-yellow-500/10 transition-transform group-hover/item:scale-110" />
            <span>ממתין לשיבוץ</span>
          </div>
          <div className="flex items-center gap-4 flex-row-reverse text-xs font-black text-slate-800 group/item">
            <div className="size-5 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-white ring-2 ring-blue-500/10 transition-transform group-hover/item:scale-110" />
            <span>משובץ להפצה</span>
          </div>
          <div className="h-px bg-slate-200/60 mx-1"></div>
          <div className="flex items-center gap-4 flex-row-reverse text-xs font-black text-slate-800 group/item">
            <div className="size-6 rounded-[0.8rem] bg-orange-500 border-2 border-white shadow-xl transition-transform group-hover/item:rotate-6" />
            <span>חכמת (מנוף)</span>
          </div>
          <div className="flex items-center gap-4 flex-row-reverse text-xs font-black text-slate-800 group/item">
            <div className="size-6 rounded-[0.8rem] bg-purple-600 border-2 border-white shadow-xl transition-transform group-hover/item:rotate-6" />
            <span>עלי (משאית)</span>
          </div>
          <div className="flex items-center gap-4 flex-row-reverse text-xs font-black text-slate-800 group/item">
            <div className="size-6 rounded-[0.8rem] bg-emerald-500 border-2 border-white shadow-xl transition-transform group-hover/item:rotate-6" />
            <span>איסוף עצמי</span>
          </div>
        </div>
      </div>
    </div>
  );
};
