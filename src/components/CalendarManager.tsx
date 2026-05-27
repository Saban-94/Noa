import React, { useState, useEffect } from 'react';
import { 
  GoogleCalendarEvent, 
  listCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent, 
  updateCalendarEvent 
} from '../services/calendarService';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  MapPin, 
  Clock, 
  AlignLeft, 
  Loader2, 
  Sparkles, 
  X, 
  PlusCircle, 
  CalendarDays,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { playSound } from '../lib/audioService';

interface CalendarManagerProps {
  token: string;
  onClose?: () => void;
}

export const CalendarManager: React.FC<CalendarManagerProps> = ({ token, onClose }) => {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Event Form State
  const [summary, setSummary] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:00');

  // Selected Detail View
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Quick Preset Templates for H. Saban Site Operations
  const presets = [
    {
      summary: 'תיאום אספקת בטון (ח.סבן)',
      description: 'תיאום הגעת מערבלי בטון ומשאבות מול הספקים המאושרים. נא לוודא תעודות משלוח תואמות.',
      location: 'אתר הבנייה הראשי',
      durationMinutes: 60
    },
    {
      summary: 'ביקורת מול מהנדס סירקולציה ושלד',
      description: 'בדיקת קונסטרוקציה וטפסנות לפני יציקת שלב הבא. חובה להציג דוח בדיקה תואם במערכת.',
      location: 'שטח הבנייה',
      durationMinutes: 45
    },
    {
      summary: 'ישיבת פיקוח מול גליה וספקים',
      description: 'דיון על אספקת חומרים מעוכבת, סידור גאנט עבודה, ונראות תעודות משלוח במערכת SabanOS.',
      location: 'משרד האתר',
      durationMinutes: 90
    },
    {
      summary: 'פינוי פסולת בניין והכנת שטחים',
      description: 'תיאום מכולות פינוי וציוד כבד לצורך שמירה על בטיחות מקסימלית באתר סבן.',
      location: 'שטח האתר',
      durationMinutes: 120
    }
  ];

  // Fetch upcoming calendar events
  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const gEvents = await listCalendarEvents(token);
      setEvents(gEvents);
    } catch (err: any) {
      console.error("Failed to load calendar events", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [token]);

  // Create event from form
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setCreating(true);
    try {
      const startIso = `${eventDate}T${startTime}:00`;
      const endIso = `${eventDate}T${endTime}:00`;

      await createCalendarEvent(token, {
        summary,
        description,
        location,
        startTime: new Date(startIso).toISOString(),
        endTime: new Date(endIso).toISOString()
      });

      playSound('sent');
      // Reset fields
      setSummary('');
      setDescription('');
      setLocation('');
      
      // Refresh list
      await loadEvents();
    } catch (err) {
      console.error("Error creating event", err);
      alert("שגיאה ברישום האירוע ב-Google Calendar.");
    } finally {
      setCreating(false);
    }
  };

  // Prefill fields with site template
  const applyPreset = (preset: typeof presets[0]) => {
    setSummary(preset.summary);
    setDescription(preset.description);
    setLocation(preset.location);
    
    // Set EndTime based on current StartTime and duration
    const [hrs, mins] = startTime.split(':').map(Number);
    const totalMins = hrs * 60 + mins + preset.durationMinutes;
    const endHrs = Math.floor(totalMins / 60) % 24;
    const endMins = totalMins % 60;
    
    const formattedEnd = `${String(endHrs).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    setEndTime(formattedEnd);
    
    playSound('received');
  };

  // Delete event with mandatory confirmation statement
  const handleDeleteEvent = async (id: string, name: string) => {
    const isConfirmed = window.confirm(
      `אזהרה: האם אתה בטוח שברצונך למחוק אירוע זה מתוך יומן Google Calendar שלך?\n\nאירוע: "${name}"`
    );
    if (!isConfirmed) return;

    playSound('alert');
    try {
      await deleteCalendarEvent(token, id);
      setEvents(prev => prev.filter(e => e.id !== id));
      if (selectedEventId === id) {
        setSelectedEventId(null);
      }
    } catch (err) {
      console.error("Error deleting event", err);
      alert("שגיאה במחיקת האירוע מתוך Google Calendar.");
      await loadEvents();
    }
  };

  // Format date helper for Hebrew reader
  const formatEventTime = (event: GoogleCalendarEvent) => {
    try {
      const startStr = event.start.dateTime || event.start.date;
      const endStr = event.end.dateTime || event.end.date;
      if (!startStr) return '';

      const startObj = new Date(startStr);
      const isAllDay = !event.start.dateTime;

      const dateStr = startObj.toLocaleDateString('he-IL', {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        year: '2-digit'
      });

      if (isAllDay) {
        return `${dateStr} • יום שלם`;
      }

      const endObj = endStr ? new Date(endStr) : null;
      const startTimeStr = startObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const endTimeStr = endObj ? endObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';

      return `${dateStr}  |  ${startTimeStr}${endTimeStr ? ' - ' + endTimeStr : ''}`;
    } catch (error) {
      return '';
    }
  };

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const getDayNumber = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).getDate();
    } catch {
      return '';
    }
  };

  const getMonthName = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden text-[#1E293B]" dir="rtl">
      
      {/* Header Area */}
      <div className="bg-[#1E293B] text-white p-6 shrink-0 flex items-center justify-between border-b border-[#C5A059]/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-[#C5A059]">
            <CalendarDays size={20} className="animate-spin-slow text-[#C5A059]" />
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">לוח יומן ועבודה - Google Calendar</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">סנכרון תיאומים ופגישות עבודה בזמן אמת</p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400">
            <X size={22} />
          </button>
        )}
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT COMPONENT: List of Events */}
        <div className="flex-1 p-6 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4 flex-row-reverse">
            <h3 className="text-sm font-black text-slate-700">פגישות ותיאומים קרובים ביומן</h3>
            <button 
              onClick={loadEvents}
              className="text-[10px] bg-slate-200 hover:bg-slate-300 font-bold px-2.5 py-1 rounded-lg transition-all"
            >
              רענן יומן
            </button>
          </div>

          <div className="flex-1 bg-white p-5 rounded-3xl border border-slate-200/60 overflow-y-auto custom-scrollbar flex flex-col gap-3">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="animate-spin text-[#C5A059]" size={32} />
                <p className="text-xs font-bold text-slate-400">מושך אירועים מיומן Google...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 px-4 text-center">
                <div className="size-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <div className="max-w-md">
                  <h4 className="text-sm font-black text-slate-800 mb-2">חיבור ל-Google Calendar נחסם (שגיאה 403 / שירות כבוי)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">
                    נראה שאינטגרציית לוח השנה (Google Calendar API) אינה מופעלת בפרויקט הגוגל שלך <code className="bg-slate-100 font-mono px-1.5 py-0.5 rounded-md text-amber-700 font-bold">saban-ai-drive</code>. על מנת לאפשר סנכרון של יומני ח.סבן בזמן אמת, יש להפעיל את השרות בקונסולת Google Cloud.
                  </p>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right space-y-2 text-[11px] font-medium text-slate-600">
                    <p className="font-extrabold text-[#1E293B]">צעדים קלים לפתרון הבעיה במערכת:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                      <li>פתח את: <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer" className="text-[#C5A059] hover:underline font-bold font-sans">ספריית Google Calendar API בקונסול ↗</a></li>
                      <li>ודא שבחרת בפרויקט: <span className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-800">saban-ai-drive</span> בחלק העליון.</li>
                      <li>לחץ על כפתור <strong>Enable</strong> (הפעל) כדי לאשר את השירות לשימוש.</li>
                      <li>האינטגרציה תעבוד מיידית.</li>
                    </ol>
                  </div>

                  <button
                    onClick={loadEvents}
                    className="mt-5 px-5 py-2 hover:text-[#1E293B] hover:bg-[#C5A059] text-white bg-slate-800 text-xs font-black rounded-xl transition-all shadow-md"
                  >
                    לחץ כאן כדי לרענן ולנסות שוב
                  </button>
                </div>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-3">
                {events.map(event => {
                  const sTime = event.start.dateTime || event.start.date;
                  const isCurrentDay = isToday(sTime);
                  const isSelected = selectedEventId === event.id;

                  return (
                    <div 
                      key={event.id}
                      onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex gap-4 ${
                        isSelected 
                          ? 'bg-amber-50/40 border-[#C5A059]/40 shadow-sm'
                          : isCurrentDay 
                            ? 'bg-rose-50/20 border-rose-200/50 hover:bg-slate-50' 
                            : 'bg-white border-slate-100/90 hover:border-slate-200 shadow-xs'
                      }`}
                    >
                      {/* Styled Mini Calendar Date Indicator */}
                      <div className="flex flex-col items-center justify-center size-12 bg-slate-100 rounded-xl shrink-0 text-[#1E293B] font-sans">
                        <span className="text-lg font-black leading-none">{getDayNumber(sTime) || '•'}</span>
                        <span className="text-[9px] font-bold text-[#C5A059] leading-none mt-1">{getMonthName(sTime) || 'יומן'}</span>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 text-right min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 flex-row-reverse justify-end mb-1">
                          <h4 className="text-sm font-extrabold text-[#1E293B] truncate">{event.summary || '(ללא כותרת)'}</h4>
                          {isCurrentDay && (
                            <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded font-black tracking-wide uppercase">היום</span>
                          )}
                        </div>

                        {/* Event Time indicator */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold flex-row-reverse justify-end">
                          <Clock size={11} className="text-[#C5A059]" />
                          <span className="font-sans">{formatEventTime(event)}</span>
                        </div>

                        {/* Location indicator */}
                        {event.location && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-1 flex-row-reverse justify-end truncate">
                            <MapPin size={11} className="text-[#C5A059]" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {/* Detailed expansion */}
                        {isSelected && event.description && (
                          <div className="mt-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                            <div className="font-extrabold text-[#1E293B] mb-1 text-[10px]">תיאור מורחב:</div>
                            {event.description}
                          </div>
                        )}
                        
                        {/* Google Event redirect link */}
                        {isSelected && event.htmlLink && (
                          <div className="mt-2.5 flex justify-end">
                            <a 
                              href={event.htmlLink}
                              target="_blank"
                              rel="noreferrer referrer"
                              className="text-[10px] text-[#C5A059] font-black hover:underline"
                            >
                              פתח ביומן Google החיצוני ↗
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Delete Event Icon Action with confirmation constraint */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id, event.summary || 'אירוע יומן');
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 duration-150 absolute left-3 top-4"
                        title="מחק אירוע"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                  <Calendar size={24} className="text-slate-300" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-700">אין פגישות או תיאומים ביומן</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                    לוח השנה פנוי לתיאומים חדשים. מצאו את כפתור ההוספה בצד לרשום פגישת ספקים חדשה.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: Preset Templates & Creation Tool */}
        <div className="w-full lg:w-96 bg-white border-r lg:border-r-0 lg:border-l border-slate-200/80 p-6 flex flex-col gap-5 overflow-y-auto shrink-0">
          
          {/* Quick preset templates section */}
          <div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 flex-row-reverse mb-3">
              <h3 className="text-xs font-black text-slate-700">תבניות סידור עבודה מהירות</h3>
              <Sparkles size={14} className="text-[#C5A059]" />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-right p-2.5 rounded-xl border border-slate-100/95 hover:border-[#C5A059]/30 hover:bg-slate-50 transition-all flex flex-col gap-1 shadow-xs"
                >
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 flex-row-reverse justify-end">
                    <span className="size-1.5 rounded-full bg-[#C5A059]" />
                    {preset.summary.slice(0, 36)}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold truncate">{preset.location} ({preset.durationMinutes} דק׳)</p>
                </button>
              ))}
            </div>
          </div>

          {/* Creation form */}
          <div className="mt-2">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 flex-row-reverse mb-3">
              <h3 className="text-xs font-black text-slate-700">יצירת פגישה או תיאום חדש ביומן</h3>
              <PlusCircle size={14} className="text-[#C5A059]" />
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block text-right">נושא / כותרת הפגישה</label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="לדוגמא: הבאת מלט סגן ראשי / שלב א"
                  className="w-full bg-slate-50/50 px-3 py-2 text-xs font-bold border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans"
                  disabled={creating}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block text-right">מיקום</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="בשטח תת-פרק / משרדים"
                  className="w-full bg-slate-50/50 px-3 py-2 text-xs font-medium border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans"
                  disabled={creating}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block text-right">תאריך</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-50/50 px-3 py-2 text-xs font-bold border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans"
                  disabled={creating}
                  required
                />
              </div>

              {/* Time pickers grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block text-right">שעת סיום</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50/50 px-3 py-2 text-xs font-bold border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans"
                    disabled={creating}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block text-right">שעת התחלה</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50/50 px-3 py-2 text-xs font-bold border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans"
                    disabled={creating}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block text-right">פירוט / הערות</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="פירוט המשימות למפגש זה, שמות משתתפים ועוד..."
                  className="w-full bg-slate-50/50 px-3 py-2 text-xs font-medium border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans h-20 resize-none"
                  disabled={creating}
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-[#1E293B] text-white hover:bg-[#C5A059] hover:text-[#1E293B] font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                disabled={creating || !summary.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>רושם ב-Google Calendar...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>רשום פגישה ביומן</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
