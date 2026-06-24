/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, CheckSquare, Square, X } from "lucide-react";
import type { Subtask, Task } from "../types";

interface SubtaskListProps {
  task: Task;
  onUpdateSubtasks: (newSubtasks: Subtask[]) => void;
}

export default function SubtaskList({ task, onUpdateSubtasks }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("");

  const handleToggle = (subId: string) => {
    const updated = task.subtasks.map(s => 
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    onUpdateSubtasks(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSub: Subtask = {
      id: "sub-" + Math.random().toString(36).substr(2, 9),
      title: newTitle.trim(),
      completed: false
    };

    onUpdateSubtasks([...task.subtasks, newSub]);
    setNewTitle("");
  };

  const handleDelete = (subId: string) => {
    onUpdateSubtasks(task.subtasks.filter(s => s.id !== subId));
  };

  const getProgressPercent = () => {
    if (task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)] pl-8 pr-4 pb-2 space-y-3">
      {/* Subtasks Progress Bar */}
      {task.subtasks.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <span>Checklist Progress</span>
            <span>{getProgressPercent()}% completed</span>
          </div>
          <div className="w-full bg-[var(--border)] h-1 rounded-full overflow-hidden">
            <div 
              className="bg-[var(--accent)] h-full transition-all duration-300"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {task.subtasks.map((sub) => (
          <div 
            key={sub.id} 
            className="flex items-center justify-between group py-1 px-2 rounded-md hover:bg-[var(--bg-card-hover)] transition-all"
          >
            <div 
              onClick={() => handleToggle(sub.id)}
              className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
            >
              {sub.completed ? (
                <CheckSquare className="w-4 h-4 text-[var(--accent)] shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0 group-hover:text-[var(--text-secondary)]" />
              )}
              <span className={`text-xs font-medium ${sub.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-secondary)]"}`}>
                {sub.title}
              </span>
            </div>

            <button
              onClick={() => handleDelete(sub.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-rose-400 rounded-md transition-all"
              title="Delete subtask"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Inline Subtask Form */}
      <form onSubmit={handleAdd} className="flex gap-2 pt-1.5">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add list detail..."
          className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-[var(--border)] bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-all"
          maxLength={100}
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] flex items-center justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
