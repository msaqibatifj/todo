/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { useTaskFlow } from "../store/stateContext";
import type { TaskList } from "../types";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingList: TaskList | null;
}

const PRESET_EMOJIS = [
  "📋", "📥", "💼", "💖", "⚡", "🏠", "🍕", "🎮", 
  "🌱", "✈️", "🏋️", "📚", "🎨", "🎬", "🎵", "💰", 
  "🛠️", "🚀", "🔥", "🦄", "🎯", "🥑", "🏖️", "💤"
];

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#eab308", // Yellow
  "#f97316", // Orange
  "#ef4444", // Red
  "#ec4899", // Pink
  "#a855f7", // Purple
  "#64748b"  // Slate
];

export default function CreateListModal({ 
  isOpen, 
  onClose,
  editingList
}: CreateListModalProps) {
  const { createList, updateList } = useTaskFlow();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingList) {
      setName(editingList.name);
      setIcon(editingList.icon);
      setColor(editingList.color);
    } else {
      setName("");
      setIcon("📋");
      setColor("#6366f1");
    }
    setError("");
  }, [editingList, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a list name");
      return;
    }

    if (editingList) {
      updateList(editingList.id, name.trim(), icon, color);
    } else {
      createList(name.trim(), icon, color);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md card-glass p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {editingList ? "Configure List" : "Create New List"}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* List Name */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">List Name</label>
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-xl border border-[var(--border)] flex items-center justify-center text-2xl bg-[var(--bg-card)]">
                {icon}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="e.g. Vacation Prep, Side Hustle"
                className="input-glass flex-1 text-base font-medium h-12"
                maxLength={30}
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-xs mt-1.5 font-medium">{error}</p>}
          </div>

          {/* Emoji Select */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-2 block">Icon Emoji</label>
            <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto p-1 border border-[var(--border)] rounded-xl bg-opacity-20 bg-[var(--bg-secondary)]">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`h-10 text-xl rounded-lg hover:bg-[var(--bg-card-hover)] transition-all ${icon === emoji ? "bg-[var(--accent)] text-white scale-105 shadow-md shadow-[var(--accent-glow)]" : ""}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-2 block">Accent Color</label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center relative shadow-sm transition-transform active:scale-95"
                  style={{ backgroundColor: presetColor }}
                >
                  {color === presetColor && (
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 py-3 font-semibold shadow-lg shadow-[var(--accent-glow)]"
            >
              {editingList ? "Save Settings" : "Create List"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
