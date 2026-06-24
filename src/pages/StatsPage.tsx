/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTaskFlow } from "../store/stateContext";
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ListTodo,
  Calendar,
  Flag
} from "lucide-react";

export default function StatsPage() {
  const { tasks, lists } = useTaskFlow();

  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter(t => t.status === "done").length;
  const totalActive = tasks.filter(t => t.status === "todo").length;
  const completionPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(t => t.status === "todo" && t.due_date && t.due_date.slice(0, 10) === todayStr);
  const overdueTasks = tasks.filter(t => t.status === "todo" && t.due_date && t.due_date.slice(0, 10) < todayStr);
  const urgentTasks = tasks.filter(t => t.status === "todo" && (t.priority === "urgent" || t.priority === "high"));

  const tasksWithSubtasks = tasks.filter(t => t.subtasks.length > 0);
  const subtaskCompletionRate = tasksWithSubtasks.length > 0
    ? Math.round(tasksWithSubtasks.filter(t => {
        const done = t.subtasks.filter(s => s.completed).length;
        return done > 0 && done === t.subtasks.length;
      }).length / tasksWithSubtasks.length * 100)
    : 0;

  const listBreakdown = lists.map(list => {
    const count = tasks.filter(t => t.list_id === list.id && t.status === "todo").length;
    return { ...list, count };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="font-sans">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Statistics Hub
        </h2>
        <p className="text-xs font-bold text-[var(--text-muted)]">Real-time productivity metrics and workspace insights</p>
      </div>

      {/* Big Number Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-glass p-5 text-center">
          <span className="text-4xl font-black text-[var(--text-primary)]">{totalActive}</span>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mt-1">Active Tasks</p>
        </div>
        <div className="card-glass p-5 text-center">
          <span className="text-4xl font-black text-emerald-500">{totalCompleted}</span>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mt-1">Completed</p>
        </div>
        <div className="card-glass p-5 text-center">
          <span className="text-4xl font-black text-amber-500">{completionPercent}%</span>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mt-1">Done Rate</p>
        </div>
        <div className="card-glass p-5 text-center">
          <span className="text-4xl font-black text-rose-500">{urgentTasks.length}</span>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mt-1">Urgent Items</p>
        </div>
      </div>

      {/* Charts & Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Completion Bar */}
        <div className="card-glass p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--text-primary)]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Completion Progress</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[var(--text-muted)]">{totalCompleted} of {totalTasks} tasks done</span>
              <span className="text-[var(--text-primary)]">{completionPercent}%</span>
            </div>
            <div className="w-full h-4 border-2 border-[var(--border)] bg-[var(--bg-secondary)]">
              <div 
                className="h-full bg-[#facc15] transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-[var(--text-secondary)]">
                {subtaskCompletionRate}% subtask rate
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-[var(--text-secondary)]">
                {overdueTasks.length} overdue
              </span>
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="card-glass p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-[var(--text-primary)]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Priority Breakdown</h3>
          </div>
          <div className="space-y-3">
            {(["urgent", "high", "medium", "low", "none"] as const).map(p => {
              const count = tasks.filter(t => t.status === "todo" && t.priority === p).length;
              const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
              const colors: Record<string, string> = {
                urgent: "bg-rose-500",
                high: "bg-orange-500",
                medium: "bg-amber-500",
                low: "bg-emerald-500",
                none: "bg-gray-500",
              };
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-16 text-[10px] font-black uppercase text-[var(--text-muted)]">{p}</span>
                  <div className="flex-1 h-3 border border-[var(--border)] bg-[var(--bg-primary)]">
                    <div 
                      className={`h-full ${colors[p]} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="card-glass p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--text-primary)]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Today's Pulse</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border-2 border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">Scheduled Today</span>
              <span className="text-lg font-black text-[var(--text-primary)]">{todayTasks.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 border-2 border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">Overdue</span>
              <span className="text-lg font-black text-rose-500">{overdueTasks.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 border-2 border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">Urgent / High</span>
              <span className="text-lg font-black text-orange-500">{urgentTasks.length}</span>
            </div>
          </div>
        </div>

        {/* List Breakdown */}
        <div className="card-glass p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[var(--text-primary)]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Per-List Load</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {listBreakdown.map(list => (
              <div key={list.id} className="flex items-center justify-between p-2 border border-[var(--border)]">
                <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                  <span>{list.icon}</span>
                  <span>{list.name}</span>
                </span>
                <span className="text-sm font-black text-[var(--text-primary)]">{list.count}</span>
              </div>
            ))}
            {/* Uncategorized */}
            <div className="flex items-center justify-between p-2 border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                <span>📥</span>
                <span>Uncategorized</span>
              </span>
              <span className="text-sm font-black text-[var(--text-primary)]">
                {tasks.filter(t => !t.list_id && t.status === "todo").length}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
