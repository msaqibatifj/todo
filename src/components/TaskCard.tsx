/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  Calendar, 
  Tag, 
  Edit2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ListTodo
} from "lucide-react";
import type { Task, Priority } from "../types";
import { useTaskFlow } from "../store/stateContext";
import SubtaskList from "./SubtaskList";

interface TaskCardProps {
  key?: string;
  task: Task;
  index: number;
  totalTasks: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const PRIORITY_BADGES: Record<Priority, { label: string; text: string; bg: string; border: string }> = {
  none: { label: "P4", text: "text-stone-400", bg: "bg-stone-100", border: "border-stone-300" },
  low: { label: "LOW", text: "text-emerald-700", bg: "bg-emerald-100", border: "border-black" },
  medium: { label: "MEDIUM", text: "text-amber-700", bg: "bg-amber-100", border: "border-black" },
  high: { label: "HIGH", text: "text-orange-700", bg: "bg-orange-100", border: "border-black" },
  urgent: { label: "URGENT", text: "text-red-700", bg: "bg-red-100", border: "border-black" }
};

export default function TaskCard({ 
  task, 
  index, 
  totalTasks,
  onMoveUp,
  onMoveDown 
}: TaskCardProps) {
  const { updateTask, deleteTask, openTaskForm, lists } = useTaskFlow();
  const [isExpanded, setIsExpanded] = useState(false);

  const isCompleted = task.status === "done";

  const toggleStatus = () => {
    updateTask(task.id, {
      status: isCompleted ? "todo" : "done"
    });
  };

  const getDueDateString = () => {
    if (!task.due_date) return "";
    try {
      const d = new Date(task.due_date);
      return d.toLocaleDateString(undefined, { 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } catch {
      return task.due_date;
    }
  };

  const isOverdue = () => {
    if (!task.due_date || isCompleted) return false;
    return new Date(task.due_date).getTime() < Date.now();
  };

  const getListInfo = () => {
    if (!task.list_id) return null;
    return lists.find(l => l.id === task.list_id) || null;
  };

  const listInfo = getListInfo();
  const priorityBadge = PRIORITY_BADGES[task.priority];

  return (
    <div className={`card-glass p-4 group select-none transition-all duration-150 font-sans ${isCompleted ? "opacity-60 border-dashed bg-stone-100 dark:bg-stone-900" : "bg-[var(--bg-secondary)]"}`}>
      <div className="flex items-start gap-3.5">
        {/* Toggle Checkbox */}
        <button 
          onClick={toggleStatus}
          className="mt-1 flex items-center justify-center w-5 h-5 border-2 border-black rounded-none transition-all duration-150 cursor-pointer shrink-0"
          style={{ backgroundColor: isCompleted ? "#facc15" : "transparent" }}
          title={isCompleted ? "Mark incomplete" : "Mark completed"}
        >
          {isCompleted && (
            <svg className="w-3.5 h-3.5 text-black stroke-[4px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Task Body */}
        <div className="flex-1 space-y-1.5 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Title */}
            <span 
              onClick={() => openTaskForm(task.id)}
              className={`text-sm font-black uppercase tracking-tight text-[var(--text-primary)] cursor-pointer hover:text-red-500 transition-colors break-words ${isCompleted ? "line-through text-[var(--text-muted)] font-bold opacity-60" : ""}`}
            >
              {task.title}
            </span>

            {/* List indicator badge */}
            {listInfo && (
              <span 
                className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-none border-2 border-black bg-white text-black shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                <span>{listInfo.icon}</span>
                <span>{listInfo.name}</span>
              </span>
            )}

            {/* Priority Badge */}
            {task.priority !== "none" && (
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-none border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${priorityBadge.text} ${priorityBadge.bg} shrink-0`}>
                {priorityBadge.label}
              </span>
            )}
          </div>

          {/* Notes description preview */}
          {task.notes && (
            <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed line-clamp-2 pr-4 break-words">
              {task.notes}
            </p>
          )}

          {/* Metadata Row: Due Date, Tags, Subtask count */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {/* Due Date */}
            {task.due_date && (
              <span className={`inline-flex items-center gap-1 shrink-0 ${isOverdue() ? "text-red-600 font-black border-2 border-red-600 bg-red-50 px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] animate-pulse" : "text-[var(--text-muted)]"}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-mono">{getDueDateString()}</span>
                {isOverdue() && <span className="text-[9px] font-black uppercase ml-1">Overdue</span>}
              </span>
            )}

            {/* Subtasks Count */}
            {task.subtasks.length > 0 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 hover:text-[var(--text-secondary)] transition-colors shrink-0 font-bold"
              >
                <ListTodo className="w-3.5 h-3.5 text-black" />
                <span>
                  {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                </span>
              </button>
            )}

            {/* Tags list */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 shrink-0 font-bold">
                <Tag className="w-3.5 h-3.5 text-black" />
                {task.tags.map(t => (
                  <span key={t} className="text-[10px] hover:text-[var(--text-primary)] transition-colors">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Task Actions panel */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          {/* Move actions for sorting order */}
          {onMoveUp && (
            <button 
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1 text-[var(--text-primary)] border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-35 rounded-none transition-all shadow-[1px_1px_0px_0px_var(--border)]"
              title="Move Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {onMoveDown && (
            <button 
              onClick={onMoveDown}
              disabled={index === totalTasks - 1}
              className="p-1 text-[var(--text-primary)] border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-35 rounded-none transition-all shadow-[1px_1px_0px_0px_var(--border)]"
              title="Move Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Subtask expander */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 text-[var(--text-primary)] border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[#facc15] hover:text-black rounded-none transition-all shadow-[1px_1px_0px_0px_var(--border)] ${isExpanded ? "rotate-180 bg-[#facc15] text-black" : ""}`}
            title="Toggle checklist"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Edit */}
          <button 
            onClick={() => openTaskForm(task.id)}
            className="p-1 text-[var(--text-primary)] border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[#facc15] hover:text-black rounded-none transition-all shadow-[1px_1px_0px_0px_var(--border)]"
            title="Edit Task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button 
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
                deleteTask(task.id);
              }
            }}
            className="p-1 text-red-600 border-2 border-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-none transition-all shadow-[1px_1px_0px_0px_red]"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded subtask list */}
      {isExpanded && (
        <SubtaskList 
          task={task} 
          onUpdateSubtasks={(subtasks) => {
            updateTask(task.id, { subtasks });
          }} 
        />
      )}
    </div>
  );
}
