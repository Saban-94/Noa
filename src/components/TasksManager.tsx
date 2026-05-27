import React, { useState, useEffect } from 'react';
import { GoogleTaskList, GoogleTask, listTaskLists, listTasks, createTask, updateTask, deleteTask, createTaskList } from '../services/tasksService';
import { CheckCircle2, Circle, Plus, Trash2, Calendar, FileText, Loader2, Sparkles, FolderPlus, Compass, ListTodo, X, AlertTriangle } from 'lucide-react';
import { playSound } from '../lib/audioService';

interface TasksManagerProps {
  token: string;
  onClose?: () => void;
}

export const TasksManager: React.FC<TasksManagerProps> = ({ token, onClose }) => {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loadingLists, setLoadingLists] = useState<boolean>(false);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [error, setError] = useState<string | null>(null);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);

  // New task list state
  const [newListName, setNewListName] = useState<string>('');
  const [showAddListForm, setShowAddListForm] = useState<boolean>(false);
  const [isCreatingList, setIsCreatingList] = useState<boolean>(false);

  // Load Task Lists
  const fetchLists = async () => {
    setLoadingLists(true);
    setError(null);
    try {
      const lists = await listTaskLists(token);
      setTaskLists(lists);
      if (lists.length > 0) {
        if (!selectedListId || !lists.some(l => l.id === selectedListId)) {
          setSelectedListId(lists[0].id);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch task lists", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingLists(false);
    }
  };

  // Load Tasks for Selected List
  const fetchTasksForList = async (listId: string) => {
    if (!listId) return;
    setLoadingTasks(true);
    setError(null);
    try {
      const listItems = await listTasks(token, listId, true);
      // Sort tasks: Active first, ordered by position (or updated), completed at the bottom
      const sorted = [...listItems].sort((a, b) => {
        if (a.status === b.status) {
          return (a.position || '').localeCompare(b.position || '');
        }
        return a.status === 'completed' ? 1 : -1;
      });
      setTasks(sorted);
    } catch (err: any) {
      console.error("Failed to fetch tasks for list:", listId, err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [token]);

  useEffect(() => {
    if (selectedListId) {
      fetchTasksForList(selectedListId);
    }
  }, [selectedListId, token]);

  // Handle Add New Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedListId) return;

    setIsCreatingTask(true);
    try {
      await createTask(token, selectedListId, {
        title: newTaskTitle,
        notes: newTaskNotes ? newTaskNotes : undefined,
        due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined
      });
      
      playSound('sent');
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');
      
      // Refresh list
      await fetchTasksForList(selectedListId);
    } catch (err) {
      console.error("Failed to create task", err);
      alert("שגיאה ביצירת המשימה במערכת גוגל.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: GoogleTask) => {
    if (!selectedListId) return;
    
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    playSound('received');

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await updateTask(token, selectedListId, task.id, {
        status: newStatus
      });
    } catch (err) {
      console.error("Failed to update task status", err);
      // Revert if error
      await fetchTasksForList(selectedListId);
    }
  };

  // Handle Delete Task (Mandatory confirmation for mutative workspace API calls)
  const handleDeleteTask = async (task: GoogleTask) => {
    if (!selectedListId) return;

    const confirmed = window.confirm(
      `האם אתה בטוח שברצונך למחוק משימה זו מתוך Google Tasks?\n\nמשימה: "${task.title}"\nפעולה זו אינה הפיכה.`
    );
    if (!confirmed) return;

    playSound('alert');
    try {
      await deleteTask(token, selectedListId, task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("שגיאה במחיקת המשימה.");
      await fetchTasksForList(selectedListId);
    }
  };

  // Handle Add New Task List
  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setIsCreatingList(true);
    try {
      const newList = await createTaskList(token, newListName);
      playSound('sent');
      setTaskLists(prev => [...prev, newList]);
      setSelectedListId(newList.id);
      setNewListName('');
      setShowAddListForm(false);
    } catch (err) {
      console.error("Failed to create list", err);
      alert("שגיאה ביצירת רשימה חדשה.");
    } finally {
      setIsCreatingList(false);
    }
  };

  // Filtered list
  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return task.status === 'needsAction';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden text-[#1E293B]" dir="rtl">
      
      {/* Top Controller Header */}
      <div className="bg-[#1E293B] text-white p-6 shrink-0 flex items-center justify-between border-b border-[#C5A059]/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-[#C5A059]">
            <ListTodo size={20} className="animate-pulse" />
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">משימות וסידורי עבודה - Google Tasks</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">סנכרון משימות ח.סבן בזמן אמת</p>
          </div>
        </div>
        
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400">
            <X size={22} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* RIGHT SIDEBAR: List Selector and New List Creator */}
        <div className="w-full md:w-64 bg-white border-l border-slate-200/80 p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
          <div className="flex justify-between items-center text-xs font-black text-slate-400 tracking-wider">
            <span>רשימות משימות פתוחות</span>
            <button 
              onClick={() => setShowAddListForm(!showAddListForm)}
              className="p-1 hover:bg-slate-100 rounded-md text-[#C5A059] transition-colors"
              title="רשימה חדשה"
            >
              <FolderPlus size={16} />
            </button>
          </div>

          {/* Add List Form */}
          {showAddListForm && (
            <form onSubmit={handleAddList} className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 flex flex-col gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="שם הרשימה..."
                className="w-full bg-white px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-[#C5A059] text-right"
                disabled={isCreatingList}
                required
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddListForm(false)}
                  className="px-2 py-1 text-[10px] font-black hover:bg-slate-200 rounded-md text-slate-600"
                >
                  בטל
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#C5A059] text-[#1E293B] font-black text-[10px] rounded-md hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1"
                  disabled={isCreatingList}
                >
                  {isCreatingList ? <Loader2 size={10} className="animate-spin" /> : 'צור'}
                </button>
              </div>
            </form>
          )}

          {/* Loading States */}
          {loadingLists ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="animate-spin text-[#C5A059]" size={20} />
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-[10px] font-bold text-center">
              שגיאת סנכרון מול שירותי גוגל. ראו פרטים פותרים במסך המרכזי.
            </div>
          ) : (
            <div className="space-y-1">
              {taskLists.map(list => {
                const isSelected = list.id === selectedListId;
                return (
                  <button
                    key={list.id}
                    onClick={() => {
                      setSelectedListId(list.id);
                      setFilter('active');
                    }}
                    className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-between transition-all border ${
                      isSelected 
                        ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30 font-extrabold' 
                        : 'bg-transparent text-slate-600 hover:bg-slate-50 border-transparent hover:text-slate-900'
                    }`}
                  >
                    <span>{list.title}</span>
                    {isSelected && <div className="size-2 rounded-full bg-[#C5A059]" />}
                  </button>
                );
              })}
            </div>
          )}

              {/* Dashboard Quick Status */}
          <div className="mt-auto bg-[#1E293B] text-white p-4 rounded-2xl relative overflow-hidden hidden md:block border border-white/5 shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C5A059]/10 blur-2xl rounded-full" />
            <div className="relative">
              <span className="text-[10px] font-black uppercase text-[#C5A059] tracking-wider block mb-1">מדד משימות</span>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-2xl font-black font-sans text-white">
                  {tasks.filter(t => t.status === 'needsAction').length}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">פעילות בקבוצה</span>
              </div>

              {/* Overdue Tasks Badge in Sidebar Metrics */}
              {tasks.some(t => t.status !== 'completed' && t.due && new Date(t.due).getTime() < new Date().setHours(0,0,0,0)) && (
                <div className="flex justify-between items-center mb-3 bg-red-500/10 px-2.5 py-1.5 rounded-xl border border-red-500/20 text-red-300">
                  <span className="text-sm font-black font-sans">
                    {tasks.filter(t => t.status !== 'completed' && t.due && new Date(t.due).getTime() < new Date().setHours(0,0,0,0)).length}
                  </span>
                  <span className="text-[9px] font-black flex items-center gap-1">
                    <AlertTriangle size={10} className="animate-pulse text-red-400" />
                    באיחור תפעולי
                  </span>
                </div>
              )}

              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#C5A059] h-full" 
                  style={{ 
                    width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0}%` 
                  }} 
                />
              </div>
              <div className="flex justify-between text-[8px] text-slate-500 font-bold mt-1">
                <span>{tasks.filter(t => t.status === 'completed').length} בוצעו</span>
                <span>{tasks.length} סה"כ</span>
              </div>
            </div>
          </div>
        </div>

        {/* COMPONENT BODY: Tasks Listing and Core Addition Engine */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          
          {/* Quick Filter buttons */}
          <div className="flex items-center gap-2 mb-4 shrink-0 flex-row-reverse">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                filter === 'active' 
                  ? 'bg-slate-800 text-white border-slate-800' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              משימות לביצוע ({tasks.filter(t => t.status === 'needsAction').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                filter === 'completed' 
                  ? 'bg-slate-800 text-white border-slate-800' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              הושלמו ({tasks.filter(t => t.status === 'completed').length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                filter === 'all' 
                  ? 'bg-slate-800 text-white border-slate-800' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              הכל ({tasks.length})
            </button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
            
            {/* TASKS SCROLL ZONE */}
            <div className="flex-1 bg-white p-5 rounded-3xl border border-slate-200/60 overflow-y-auto custom-scrollbar flex flex-col">
              {loadingTasks ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-[#C5A059]" size={32} />
                  <p className="text-xs font-bold text-slate-400">טוען משימות מהרשת של גוגל...</p>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 px-4 text-center">
                  <div className="size-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-600">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-sm font-black text-slate-800 mb-2">חיבור ל-Google Tasks נחסם (שגיאה 403 / שירות כבוי)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">
                      נראה שאינטגרציית המשימות (Google Tasks API) אינה מופעלת בפרויקט הגוגל שלך <code className="bg-slate-100 font-mono px-1.5 py-0.5 rounded-md text-amber-700 font-bold">saban-ai-drive</code>. על מנת לאפשר סנכרון של משימות ח.סבן בזמן אמת, יש להפעיל את השרות בקונסולת Google Cloud.
                    </p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right space-y-2 text-[11px] font-medium text-slate-600">
                      <p className="font-extrabold text-[#1E293B]">צעדים קלים לפתרון הבעיה במערכת:</p>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                        <li>פתח את: <a href="https://console.cloud.google.com/apis/library/tasks.googleapis.com" target="_blank" rel="noreferrer" className="text-[#C5A059] hover:underline font-bold font-sans">ספריית Google Tasks API בקונסול ↗</a></li>
                        <li>ודא שבחרת בפרויקט: <span className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-800">saban-ai-drive</span> בחלק העליון.</li>
                        <li>לחץ על כפתור <strong>Enable</strong> (הפעל) כדי לאשר את השירות לשימוש.</li>
                        <li>האינטגרציה תעבוד מיידית.</li>
                      </ol>
                    </div>

                    <button
                      onClick={fetchLists}
                      className="mt-5 px-5 py-2 hover:text-[#1E293B] hover:bg-[#C5A059] text-white bg-slate-800 text-xs font-black rounded-xl transition-all shadow-md"
                    >
                      לחץ כאן כדי לרענן ולנסות שוב
                    </button>
                  </div>
                </div>
              ) : filteredTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredTasks.map(task => {
                    const isCompleted = task.status === 'completed';
                    const isOverdue = !isCompleted && task.due && new Date(task.due).getTime() < new Date().setHours(0, 0, 0, 0);
                    
                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all group relative hover:border-[#C5A059]/30 ${
                          isCompleted 
                            ? 'bg-slate-50/70 border-slate-100 opacity-60' 
                            : isOverdue 
                              ? 'bg-red-50/20 border-red-200/80 shadow-[0_2px_12px_rgba(239,68,68,0.04)] animate-pulse-subtle' 
                              : 'bg-white border-slate-100 shadow-xs'
                        }`}
                      >
                        {/* Toggle complete button */}
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={`mt-0.5 transition-colors focus:outline-none ${
                            isCompleted ? 'text-emerald-500' : isOverdue ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-[#C5A059]'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>

                        <div className="flex-1 text-right min-w-0">
                          <div className="flex items-start gap-2 justify-between flex-row-reverse">
                            <h4 className={`text-sm font-bold leading-snug break-words flex-1 ${
                              isCompleted ? 'line-through text-slate-400 font-medium' : isOverdue ? 'text-red-950 font-black' : 'text-slate-800'
                            }`}>
                              {task.title}
                            </h4>
                            {isOverdue && (
                              <span className="shrink-0 text-[9px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full border border-red-200/50 flex items-center gap-1">
                                <AlertTriangle size={10} className="animate-pulse" />
                                באיחור תפעולי
                              </span>
                            )}
                          </div>
                          
                          {task.notes && (
                            <p className={`text-xs mt-1 whitespace-pre-wrap font-medium break-words ${
                              isOverdue ? 'text-red-700/80' : 'text-slate-500'
                            }`}>
                              {task.notes}
                            </p>
                          )}

                          {task.due && (
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold mt-2 font-sans flex-row-reverse justify-end ${
                              isOverdue ? 'text-red-600 font-black' : 'text-slate-400'
                            }`}>
                              <Calendar size={12} className={isOverdue ? 'text-red-500' : 'text-[#C5A059]'} />
                              <span>יעד: {new Date(task.due).toLocaleDateString('he-IL')}</span>
                            </div>
                          )}
                        </div>

                        {/* Delete task button */}
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 duration-150 absolute left-3 top-3"
                          title="מחק משימה"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                    <ListTodo size={24} className="text-slate-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-700">אין משימות להצגה בסינון זה</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                      כל הכבוד! אין משימות נוספות שממתינות לביצוע בקטגוריה והרשימה הנוכחית.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ADD TASK ENGINE COLUMN */}
            <div className="w-full md:w-80 bg-white p-5 rounded-3xl border border-slate-200/60 flex flex-col shrink-0 gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-row-reverse">
                <h3 className="text-xs font-black text-slate-700">הוספת משימה חדשה</h3>
                <Sparkles size={14} className="text-[#C5A059]" />
              </div>

              <form onSubmit={handleAddTask} className="flex flex-col gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block text-right">כותרת המשימה</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="לקרוא לגליה, להזמין פיגומים..."
                    className="w-full bg-slate-50/50 px-3 py-2 text-xs font-bold border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans"
                    disabled={isCreatingTask || !selectedListId}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block text-right">הערות ופירוט נוסף</label>
                  <textarea
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    placeholder="פרטים נוספים שיעזרו בביצוע..."
                    className="w-full bg-slate-50/50 px-3 py-2 text-xs font-medium border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans h-20 resize-none"
                    disabled={isCreatingTask || !selectedListId}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block text-right">תאריך יעד</label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full bg-slate-50/50 px-3 py-2 text-xs font-bold border border-slate-100 rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white text-right font-sans"
                    disabled={isCreatingTask || !selectedListId}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-[#1E293B] text-white hover:bg-[#C5A059] hover:text-[#1E293B] font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  disabled={isCreatingTask || !selectedListId || !newTaskTitle.trim()}
                >
                  {isCreatingTask ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>שומר ב-Google Tasks...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>הוסף משימה לרשימה</span>
                    </>
                  )}
                </button>
              </form>

              {/* Noa Proactive suggestion helper */}
              <div className="mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3 text-right">
                <div className="size-8 rounded-lg bg-yellow-500/10 text-[#C5A059] flex items-center justify-center shrink-0">
                  <Compass size={14} />
                </div>
                <div className="text-[10px] font-bold text-slate-500 leading-relaxed">
                  הודעה מנועה-AI: ניתן להנחות אותי כאן בצ׳אט ליצור, לבדוק או להשלים משימות בגוגל דוגמת ״תרשמי משימה דחופה לפנות את המגרש יחד עם אורן״.
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
