import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Order, OrderStatus } from '../types';
import { Truck, MapPin, AlertCircle } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== '' && API_KEY !== 'YOUR_API_KEY';

interface TrackingMapProps {
  orders: Order[];
}

export const TrackingMap: React.FC<TrackingMapProps> = ({ orders }) => {
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

  // Filter orders that have location data or are in transit
  const trackableOrders = orders.filter(o => 
    (o.lat && o.lng) || o.status === OrderStatus.IN_TRANSIT
  );

  // Default center (Israel context)
  const defaultCenter = { lat: 32.0853, lng: 34.7818 };

  return (
    <div className="relative w-full h-[300px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={11}
          mapId="SABAN_TRACKING_MODE"
          colorScheme="DARK"
          gestureHandling="greedy"
          disableDefaultUI={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          {trackableOrders.map((order) => {
            const isMoving = order.status === OrderStatus.IN_TRANSIT;
            const position = { 
              lat: order.currentLat || order.lat || 32.08, 
              lng: order.currentLng || order.lng || 34.78 
            };

            return (
              <AdvancedMarker 
                key={order.id} 
                position={position}
                title={order.customerName}
              >
                <div className="relative">
                  {isMoving && (
                    <div className="absolute inset-0 animate-ping bg-blue-500/40 rounded-full scale-150" />
                  )}
                  <div className={React.useMemo(() => {
                    return `p-2 rounded-full border-2 shadow-2xl transition-all ${
                      isMoving ? 'bg-blue-500 border-white text-white' : 'bg-yellow-500 border-slate-900 text-slate-900'
                    }`;
                  }, [isMoving])}>
                    {isMoving ? <Truck size={14} /> : <MapPin size={14} />}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
      
      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md p-2 rounded-lg border border-white/5 flex flex-col gap-1.5 z-10">
        <div className="flex items-center gap-2 flex-row-reverse text-[9px] font-black text-slate-300">
          <div className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span>בדרך (Real-time)</span>
        </div>
        <div className="flex items-center gap-2 flex-row-reverse text-[9px] font-black text-slate-300">
          <div className="size-2 rounded-full bg-yellow-500" />
          <span>שובץ / ממתין</span>
        </div>
      </div>
    </div>
  );
};
