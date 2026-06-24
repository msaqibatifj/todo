/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTaskFlow } from "../store/stateContext";
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  PlusCircle, 
  ArrowRight,
  FolderPlus
} from "lucide-react";


interface DashboardPageProps {
  onNavigate: (view: string, listId?: string | null) => void;
  onOpenCreateList: () => void;
}

export default function DashboardPage({ onNavigate, onOpenCreateList }: DashboardPageProps) {
  const { profile, lists, tasks, openTaskForm, setActiveListId } = useTaskFlow();

  // Compute metrics
  const totalActive = tasks.filter(t => t.status === "todo").length;
  const totalCompleted = tasks.filter(t => t.status === "done").length;
  const completionPercent = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  // Filter specific task groupings
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const todayTasks = tasks.filter(t => 
    t.status === "todo" && 
    t.due_date && 
    t.due_date.slice(0, 10) === todayStr
  );

  const urgentTasks = tasks.filter(t => 
    t.status === "todo" && 
    (t.priority === "urgent" || t.priority === "high")
  );

  const getListTaskCount = (listId: string | null) => {
    return tasks.filter(t => t.list_id === listId && t.status === "todo").length;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome header banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-[var(--text-primary)] flex items-center gap-2">
            <span>Welcome back, {profile?.display_name || "Guest"}!</span>
            <span className="text-xl animate-bounce">⚡</span>
          </h2>
          <p className="text-sm font-bold text-[var(--text-secondary)]">
            Here's a snapshot of your workspace today. You have <strong className="underline decoration-4 decoration-[#facc15]">{totalActive} active tasks</strong> pending.
          </p>
        </div>

        {/* Quick actions panel */}
        <div className="flex gap-3">
          <button
            onClick={onOpenCreateList}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            <FolderPlus className="w-4 h-4 text-[var(--text-primary)]" />
            <span>New List</span>
          </button>
          <button
            onClick={() => openTaskForm()}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <PlusCircle className="w-4 h-4 text-black font-black" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Performance Progress metric tracker */}
        <div className="card-glass p-6 md:col-span-2 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 border-[var(--border)] bg-black text-[#facc15] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_var(--border)]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Weekly Completion Velocity</span>
            </div>
            <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Your productivity index is high</h3>
            <p className="text-xs text-[var(--text-secondary)] font-bold leading-relaxed max-w-sm">
              Keep checking off your milestones to maintain your streak. Real-time synchronizers are tracking progress across all workspace devices.
            </p>
            <div className="flex justify-center md:justify-start gap-6 pt-1 text-xs">
              <div>
                <span className="block text-3xl font-black text-[var(--text-primary)]">{totalCompleted}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider font-bold">Completed</span>
              </div>
              <div className="border-r-2 border-[var(--border)] h-10 self-center" />
              <div>
                <span className="block text-3xl font-black text-[var(--text-primary)]">{totalActive}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider font-bold">Pending</span>
              </div>
            </div>
          </div>

          {/* Radial progress representation */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            {/* SVG circle meter */}
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="56" cy="56" r="48" 
                className="stroke-[var(--border)] fill-none" 
                strokeWidth="8"
              />
              <circle 
                cx="56" cy="56" r="48" 
                className="stroke-[var(--accent)] fill-none transition-all duration-1000 ease-out" 
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - completionPercent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-bold text-[var(--text-primary)]">{completionPercent}%</span>
              <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Rate</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today Overview widget */}
        <div className="card-glass p-6 flex flex-col justify-between gap-4 font-sans">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Scheduled Today</h3>
              <p className="text-[11px] font-bold text-[var(--text-muted)]">Tasks scheduled for today</p>
            </div>
            <span className="p-2 border-2 border-black bg-[#facc15] text-black">
              <Calendar className="w-4 h-4" />
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-16">
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.slice(0, 2).map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => { setActiveListId(t.list_id); onNavigate("list"); }}
                    className="p-2 border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between cursor-pointer transition-colors shadow-[2px_2px_0px_0px_var(--border)]"
                  >
                    <span className="truncate pr-2">{t.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-primary)]" />
                  </div>
                ))}
                {todayTasks.length > 2 && (
                  <p className="text-[10px] text-black font-black uppercase tracking-wider text-center mt-1">
                    + {todayTasks.length - 2} more tasks today
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <CheckCircle2 className="w-6 h-6 text-black mx-auto mb-1 opacity-80" />
                <p className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-wider">All caught up!</p>
              </div>
            )}
          </div>

          <button
            onClick={() => { setActiveListId("today"); onNavigate("list"); }}
            className="w-full py-2 bg-[var(--bg-secondary)] border-2 border-[var(--border)] font-black uppercase text-xs text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] shadow-[2px_2px_0px_0px_var(--border)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            Review Today List
          </button>
        </div>

        {/* Card 3: Custom Lists Index */}
        <div className="card-glass p-6 md:col-span-2 space-y-4 font-sans">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Custom Productivity Lists</h3>
              <p className="text-[11px] font-bold text-[var(--text-muted)]">Your categorized task vaults</p>
            </div>
            <button
              onClick={onOpenCreateList}
              className="text-xs font-black uppercase tracking-wider underline decoration-2 decoration-[#facc15] text-[var(--text-primary)] hover:text-red-500 transition-colors"
            >
              Configure Lists
            </button>
          </div>

          {/* Lists Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lists.map(list => {
              const pendingCount = getListTaskCount(list.id);
              return (
                <div
                  key={list.id}
                  onClick={() => { setActiveListId(list.id); onNavigate("list"); }}
                  className="p-3.5 border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all duration-150 flex items-center justify-between group shadow-[3px_3px_0px_0px_var(--border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_var(--border)]"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xl select-none shrink-0">{list.icon}</span>
                    <div className="overflow-hidden">
                      <span className="block text-xs font-black uppercase tracking-tight text-[var(--text-primary)] truncate transition-colors">{list.name}</span>
                      <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">{pendingCount} pending</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-primary)] group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Critical Hotlist Overview */}
        <div className="card-glass p-6 flex flex-col justify-between gap-4 font-sans">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Urgent / High Priority</h3>
              <p className="text-[11px] font-bold text-[var(--text-muted)]">Items requiring focus</p>
            </div>
            <span className="p-2 border-2 border-black bg-[#facc15] text-black">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-16">
            {urgentTasks.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {urgentTasks.slice(0, 3).map(t => (
                  <div 
                    key={t.id}
                    onClick={() => { setActiveListId(t.list_id); onNavigate("list"); }}
                    className="p-2 border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] text-[11px] font-bold text-[var(--text-secondary)] flex justify-between items-center cursor-pointer truncate transition-colors shadow-[2px_2px_0px_0px_var(--border)]"
                  >
                    <span className="truncate pr-1">{t.title}</span>
                    <span className="text-[8px] font-black uppercase border border-black bg-red-100 text-red-600 px-1.5 py-0.5 shrink-0">
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2">
                <CheckCircle2 className="w-6 h-6 text-black mx-auto mb-1 opacity-80" />
                <p className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-wider">No pressing items</p>
              </div>
            )}
          </div>

          <button
            onClick={() => { setActiveListId(null); onNavigate("list"); }}
            className="w-full py-2 bg-[var(--bg-secondary)] border-2 border-[var(--border)] font-black uppercase text-xs text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] shadow-[2px_2px_0px_0px_var(--border)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            Review Focus Backlog
          </button>
        </div>

      </div>
    </div>
  );
}
