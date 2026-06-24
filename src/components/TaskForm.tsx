/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Calendar, Flag, Tag, Folder, Plus, Trash } from "lucide-react";
import { useTaskFlow } from "../store/stateContext";
import type { Priority } from "../types";

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingTaskId: string | null;
}

const PRIORITIES: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: "none", label: "None", color: "text-gray-400 border-gray-500/20", bg: "bg-gray-500/10" },
  { value: "low", label: "Low", color: "text-emerald-400 border-emerald-500/20", bg: "bg-emerald-500/10" },
  { value: "medium", label: "Medium", color: "text-amber-400 border-amber-500/20", bg: "bg-amber-500/10" },
  { value: "high", label: "High", color: "text-orange-400 border-orange-500/20", bg: "bg-orange-500/10" },
  { value: "urgent", label: "Urgent", color: "text-rose-400 border-rose-500/20", bg: "bg-rose-500/10" }
];

export default function TaskForm({ isOpen, onClose, editingTaskId }: TaskFormProps) {
  const { 
    tasks, 
    lists, 
    activeListId, 
    createTask, 
    updateTask, 
    deleteTask 
  } = useTaskFlow();

  const editingTask = tasks.find(t => t.id === editingTaskId);

  // Form states
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [listId, setListId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setNotes(editingTask.notes || "");
      setDueDate(editingTask.due_date || "");
      setPriority(editingTask.priority);
      setListId(editingTask.list_id);
      setTags(editingTask.tags || []);
      setTagInput("");
    } else {
      setTitle("");
      setNotes("");
      setDueDate("");
      setPriority("none");
      // Fallback to active list ID if it is not a virtual ID like "today"
      setListId(activeListId && activeListId !== "today" ? activeListId : null);
      setTags([]);
      setTagInput("");
    }
    setError("");
  }, [editingTask, isOpen, activeListId]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    const payload = {
      title: title.trim(),
      list_id: listId,
      notes: notes.trim() || null,
      due_date: dueDate || null,
      priority,
      tags
    };

    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      createTask(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (editingTask && confirm(`Are you sure you want to delete "${editingTask.title}"?`)) {
      deleteTask(editingTask.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-opacity-95 bg-[var(--bg-secondary)] backdrop-blur-md border-l border-[var(--border)] shadow-2xl flex flex-col justify-between h-screen animate-slide-in">
      {/* Scrollable Form */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {editingTask ? "Task Editor" : "Create Task"}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">What needs to be done?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Write monthly retrospective"
              className="input-glass font-medium text-base focus:ring-2"
              maxLength={150}
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mt-1.5 font-medium">{error}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add list outlines, resource links, context guidelines..."
              rows={4}
              className="input-glass text-sm resize-none font-sans"
              maxLength={1000}
            />
          </div>

          {/* List Selection */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span>Belongs to List</span>
            </label>
            <select
              value={listId || ""}
              onChange={(e) => setListId(e.target.value || null)}
              className="input-glass text-sm cursor-pointer"
            >
              <option value="">📥 Inbox / Uncategorized</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>
                  {l.icon} {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span>Set Priority</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {PRIORITIES.map(p => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`py-2 px-1 text-xs rounded-lg border font-medium text-center transition-all ${isSelected ? `${p.color} ${p.bg} ring-2 ring-indigo-500/20 font-semibold scale-105 shadow-sm` : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Due Date</span>
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-glass text-sm"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-pink-400" />
              <span>Append Tags</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type tag & press enter"
                className="input-glass text-sm flex-1"
                maxLength={20}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Tag pills */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {tags.map(t => (
                  <span 
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] bg-[var(--border)] border border-[var(--border)] text-[var(--text-secondary)] py-1 pl-2.5 pr-1.5 rounded-full font-medium"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="p-0.5 rounded-full hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Footer Controls */}
      <div className="p-6 border-t border-[var(--border)] bg-opacity-20 bg-[var(--bg-secondary)] flex gap-3">
        {editingTask && (
          <button
            type="button"
            onClick={handleDelete}
            className="p-3 border border-red-500/20 hover:bg-red-500/10 text-red-400 rounded-xl transition-all"
            title="Delete Task"
          >
            <Trash className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost flex-1 py-3.5 rounded-xl text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary flex-1 py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-[var(--accent-glow)]"
        >
          {editingTask ? "Save Milestones" : "Confirm Task"}
        </button>
      </div>
    </div>
  );
}
