/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTaskFlow } from "../store/stateContext";
import { Calendar, Clock, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import TaskCard from "../components/TaskCard";

export default function TodayPage() {
  const { tasks, openTaskForm } = useTaskFlow();

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayTasks = tasks.filter(t => 
    t.status === "todo" && 
    t.due_date && 
    t.due_date.slice(0, 10) === todayStr
  ).sort((a, b) => {
    // Sort by priority first
    const pLevel: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
    const diff = pLevel[b.priority] - pLevel[a.priority];
    if (diff !== 0) return diff;
    // Then by sort_order
    return a.sort_order - b.sort_order;
  });

  const overdueTasks = tasks.filter(t =>
    t.status === "todo" &&
    t.due_date &&
    t.due_date.slice(0, 10) < todayStr
  ).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const completedToday = tasks.filter(t =>
    t.status === "done" &&
    t.completed_at &&
    t.completed_at.slice(0, 10) === todayStr
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="font-sans">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Today's Agenda
            </h2>
            <p className="text-xs font-bold text-[var(--text-muted)]">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => openTaskForm()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Overdue Warning */}
      {overdueTasks.length > 0 && (
        <div className="card-glass p-5 border-red-500/30 bg-red-500/5 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? "s" : ""}
            </h3>
          </div>
          <div className="space-y-2">
            {overdueTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 border border-red-500/20 bg-red-500/5">
                <span className="text-xs font-bold text-[var(--text-secondary)] truncate pr-2">{task.title}</span>
                <span className="text-[10px] font-mono font-bold text-red-400 shrink-0">
                  {task.due_date ? formatDate(task.due_date) : ""}
                </span>
              </div>
            ))}
            {overdueTasks.length > 5 && (
              <p className="text-[10px] font-black text-red-400/70 text-center">
                + {overdueTasks.length - 5} more overdue
              </p>
            )}
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="card-glass p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--text-primary)]" />
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
            Scheduled Today
          </h3>
          <span className="text-[10px] font-bold bg-[var(--border)] text-[var(--bg-secondary)] px-2 py-0.5 ml-auto">
            {todayTasks.length}
          </span>
        </div>

        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            {todayTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                totalTasks={todayTasks.length}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-black text-[var(--text-primary)]">All caught up!</p>
            <p className="text-xs font-bold text-[var(--text-muted)] mt-1">No tasks scheduled for today.</p>
          </div>
        )}
      </div>

      {/* Completed Today */}
      {completedToday.length > 0 && (
        <div className="card-glass p-6 space-y-3 opacity-70">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
              Completed Today ({completedToday.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {completedToday.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                <span className="line-through text-[var(--text-muted)] font-bold">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
