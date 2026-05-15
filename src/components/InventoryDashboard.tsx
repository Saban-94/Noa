import React from 'react';
import { cn } from '../lib/utils';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { InventoryItem } from '../types';

interface InventoryDashboardProps {
  items: InventoryItem[];
  className?: string;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ items, className }) => {
  return (
    <div className={cn("space-y-6 flex flex-col items-stretch", className)}>
      <h2 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em] px-1">מלאי קריטי</h2>
      <div className="space-y-4">
        {items.map(item => {
          const percent = Math.min(100, Math.max(5, (item.quantity / (item.minLevel * 2)) * 100));
          const isLow = item.quantity <= item.minLevel;
          return (
            <div key={item.id} className="space-y-1.5 px-1">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-tight">
                <span className="text-slate-800">{item.name}</span>
                <span className={cn("font-mono font-bold", isLow ? "text-red-500" : "text-slate-400")}>
                  {Math.round(percent)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-700",
                    isLow ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-slate-900"
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
