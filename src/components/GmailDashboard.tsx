import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { GmailMessage } from '../services/gmailService';
import { FileText, Truck, ShieldCheck, MailQuestion, Eye, RefreshCw } from 'lucide-react';

interface GmailDashboardProps {
  emails: GmailMessage[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export interface CategoryData {
  id: string;
  name: string;
  count: number;
  value: number; // percentage
  color: string;
  icon: React.ComponentType<any>;
  keywords: string[];
}

export const GmailDashboard: React.FC<GmailDashboardProps> = ({
  emails,
  selectedCategory,
  onSelectCategory
}) => {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  // Group emails and classify them
  const analytics = useMemo(() => {
    let invoices = 0;
    let delivery = 0;
    let logistics = 0;
    let other = 0;

    emails.forEach(email => {
      const subject = (email.subject || '').toLowerCase();
      const snippet = (email.snippet || '').toLowerCase();
      const body = (email.body || '').toLowerCase();
      const combinedText = `${subject} ${snippet} ${body}`;

      // 1. Invoices
      if (
        combinedText.includes('חשבונית') ||
        combinedText.includes('קבלה') ||
        combinedText.includes('תשלום') ||
        combinedText.includes('invoice') ||
        combinedText.includes('receipt') ||
        combinedText.includes('payment') ||
        combinedText.includes('billing') ||
        combinedText.includes('חשבון') ||
        combinedText.includes('מחיר')
      ) {
        invoices++;
      }
      // 2. Delivery notices
      else if (
        combinedText.includes('תעודת משלוח') ||
        combinedText.includes('משלוח') ||
        combinedText.includes('תעודה') ||
        combinedText.includes('delivery') ||
        combinedText.includes('notice') ||
        combinedText.includes('packing') ||
        combinedText.includes('dispatch') ||
        combinedText.includes('גליה') ||
        combinedText.includes('נהג') ||
        combinedText.includes('אספקה')
      ) {
        delivery++;
      }
      // 3. Logistics & Suppliers
      else if (
        combinedText.includes('ספק') ||
        combinedText.includes('מלט') ||
        combinedText.includes('בטון') ||
        combinedText.includes('ברזל') ||
        combinedText.includes('חלב') ||
        combinedText.includes('חול') ||
        combinedText.includes('חומרי בניין') ||
        combinedText.includes('חצר') ||
        combinedText.includes('מלאי') ||
        combinedText.includes('הזמנה') ||
        combinedText.includes('order') ||
        combinedText.includes('supply') ||
        combinedText.includes('inventory') ||
        combinedText.includes('stock') ||
        combinedText.includes('cement')
      ) {
        logistics++;
      }
      // 4. Other
      else {
        other++;
      }
    });

    const total = emails.length || 1; // prevent division by zero

    const categories: CategoryData[] = [
      {
        id: 'invoices',
        name: 'חשבוניות וחיובים',
        count: invoices,
        value: Math.round((invoices / total) * 100),
        color: '#C5A059', // Saban Premium Gold
        icon: FileText,
        keywords: ['חשבונית', 'קבלה', 'תשלום']
      },
      {
        id: 'delivery',
        name: 'תעודות משלוח (גליה / שטח)',
        count: delivery,
        value: Math.round((delivery / total) * 100),
        color: '#10B981', // Emerald
        icon: Truck,
        keywords: ['תעודת משלוח', 'גליה', 'נהגים']
      },
      {
        id: 'logistics',
        name: 'ספקי חומרים ומלאי',
        count: logistics,
        value: Math.round((logistics / total) * 100),
        color: '#3B82F6', // Blue
        icon: ShieldCheck,
        keywords: ['בטון', 'מלט', 'ספקים']
      },
      {
        id: 'other',
        name: 'פניות ודואר כללי',
        count: other,
        value: Math.round((other / total) * 100),
        color: '#64748B', // Slate
        icon: MailQuestion,
        keywords: ['אחר', 'כללי']
      }
    ];

    return {
      categories,
      totalCount: emails.length
    };
  }, [emails]);

  const chartData = useMemo(() => {
    return analytics.categories
      .filter(cat => cat.count > 0)
      .map(cat => ({
        name: cat.name,
        value: cat.count,
        percentage: cat.value,
        color: cat.color,
        id: cat.id
      }));
  }, [analytics]);

  if (emails.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm text-center py-10 space-y-3 mb-6">
        <div className="size-12 rounded-full bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center mx-auto">
          <RefreshCw className="animate-spin text-[#C5A059]" size={20} />
        </div>
        <h4 className="text-sm font-black text-slate-800">ביצוע ניתוח סיווג אימייל...</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          מערכת נועה-סיווג ממתינה לטעינת תנועות דואר אלקטרוני על מנת לקטלג חשבוניות ותעודות משלוח במאגר.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm mb-6 flex flex-col gap-6 text-right select-none">
      
      {/* Title block */}
      <div className="flex justify-between items-center flex-row-reverse border-b border-slate-50 pb-4">
        <div>
          <h3 className="text-base font-black text-[#1E293B]">ניתוח חלוקת תנועות דואר ספקים</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            אנליטיקה וסיווג אוטומטי של תעודות משלוח ורכש (ח.סבן Precision)
          </p>
        </div>
        <div className="bg-slate-50 px-3 py-1 bg-[#C5A059]/15 border border-[#C5A059]/20 rounded-xl text-xs font-black text-[#C5A059] flex items-center gap-1.5 flex-row-reverse shadow-inner">
          <span>{analytics.totalCount}</span>
          <span className="opacity-80">מיילים שנותחו:</span>
        </div>
      </div>

      {/* Main Content Pane: Split Chart & Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Pie Chart display */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="h-[180px] w-full relative flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, idx) => setActiveSegmentIndex(idx)}
                    onMouseLeave={() => setActiveSegmentIndex(null)}
                    onClick={(_, idx) => {
                      const selectedId = chartData[idx]?.id;
                      if (selectedId) {
                        onSelectCategory(selectedCategory === selectedId ? 'all' : selectedId);
                      }
                    }}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        opacity={activeSegmentIndex === null ? 1 : activeSegmentIndex === index ? 1 : 0.6}
                        className="transition-all duration-300 transform outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#1E293B] border border-[#C5A059]/30 p-2.5 rounded-xl text-white text-xs text-right shadow-xl">
                            <p className="font-extrabold text-[11px] mb-1">{data.name}</p>
                            <p className="font-sans font-bold flex flex-row-reverse justify-end gap-1">
                              <span>הודעות</span>
                              <span className="text-[#C5A059]">{data.value}</span>
                            </p>
                            <p className="font-sans text-slate-400 mt-0.5">{data.percentage}% מסך הכל</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-300 text-xs font-bold font-sans">אין נתוני תנועות דואר</div>
            )}

            {/* Centered Total Marker */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
              <span className="text-2xl font-black text-[#1E293B] font-sans">
                {selectedCategory !== 'all' 
                  ? analytics.categories.find(c => c.id === selectedCategory)?.count || 0
                  : analytics.totalCount}
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                {selectedCategory !== 'all' 
                  ? analytics.categories.find(c => c.id === selectedCategory)?.name.slice(0, 12) + '...'
                  : 'פריטים'}
              </span>
            </div>
          </div>
        </div>

        {/* Categories Details list */}
        <div className="md:col-span-7 flex flex-col gap-2">
          {analytics.categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const hasData = cat.count > 0;

            return (
              <button
                key={cat.id}
                onClick={() => hasData && onSelectCategory(isSelected ? 'all' : cat.id)}
                disabled={!hasData}
                style={{ 
                  borderRight: `4px solid ${cat.color}`
                }}
                className={`w-full flex justify-between items-center p-2.5 rounded-xl border border-slate-100 ${
                  isSelected 
                    ? 'bg-slate-50 border-[#C5A059]/40 shadow-sm' 
                    : hasData 
                      ? 'bg-white hover:bg-slate-50/50 hover:shadow-xs cursor-pointer' 
                      : 'bg-slate-50/40 opacity-40 cursor-not-allowed'
                } transition-all text-right flex-row-reverse`}
              >
                {/* Right block: Icon + Title */}
                <div className="flex items-center gap-2.5 flex-row-reverse">
                  <div 
                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    className="size-8 rounded-lg flex items-center justify-center border shrink-0"
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 tracking-tight">{cat.name}</h4>
                    <p className="text-[9px] text-slate-400 font-bold flex gap-1 flex-row-reverse">
                      {cat.keywords.map((kw, i) => (
                        <span key={kw}>{kw}{i < cat.keywords.length - 1 ? ' •' : ''}</span>
                      ))}
                    </p>
                  </div>
                </div>

                {/* Left block: Counts + Percent */}
                <div className="flex items-center gap-3 font-sans">
                  <div className="text-xs text-slate-600 font-bold flex flex-row-reverse gap-0.5 scale-95 origin-left">
                    <span className="text-[#1E293B] font-black font-sans">{cat.count}</span>
                    <span className="opacity-75">מיילים</span>
                  </div>
                  <div 
                    style={{ backgroundColor: isSelected ? cat.color : `${cat.color}25`, color: isSelected ? '#FFFFFF' : cat.color }}
                    className="px-2 py-0.5 rounded-md text-[10px] font-black transition-colors"
                  >
                    {cat.value}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Filter Clearance Alert segment */}
      {selectedCategory !== 'all' && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200 flex justify-between items-center text-xs flex-row-reverse">
          <span className="text-slate-600 font-bold">
            פעיל סינון דונה: מציג רק מיילים מסוג{' '}
            <strong className="text-[#C5A059] font-black">
              {analytics.categories.find(c => c.id === selectedCategory)?.name}
            </strong>
          </span>
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[10px] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/15 px-2.5 py-1 rounded-lg font-bold transition-all"
          >
            בטל סינון
          </button>
        </div>
      )}

    </div>
  );
};
