/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useTaskFlow } from "../store/stateContext";
import { 
  Sparkles, 
  BarChart3, 
  ListTodo, 
  Calendar, 
  LayoutDashboard, 
  Check 
} from "lucide-react";
import type { HomeView } from "../types";

interface ViewOption {
  id: HomeView;
  icon: React.ReactNode;
  title: string;
  desc: string;
  requiresList: boolean;
}

const VIEW_OPTIONS: ViewOption[] = [
  { 
    id: "dashboard", 
    icon: <LayoutDashboard className="w-6 h-6" />, 
    title: "Full Dashboard", 
    desc: "An overview of everything — stats, lists, today's tasks and urgent items all on one screen.",
    requiresList: false,
  },
  { 
    id: "stats", 
    icon: <BarChart3 className="w-6 h-6" />, 
    title: "Statistics Hub", 
    desc: "Productivity metrics, completion rates, trends and performance insights at a glance.",
    requiresList: false,
  },
  { 
    id: "today", 
    icon: <Calendar className="w-6 h-6" />, 
    title: "Today's Agenda", 
    desc: "Focus only on what's due today. Your daily priority list, stripped of distractions.",
    requiresList: false,
  },
  { 
    id: "list", 
    icon: <ListTodo className="w-6 h-6" />, 
    title: "Single List Focus", 
    desc: "Concentrate on one specific list. Choose which list you want as your home view.",
    requiresList: true,
  },
];

export default function OnboardingPage() {
  const { lists, completeOnboarding } = useTaskFlow();
  const [selectedView, setSelectedView] = useState<HomeView | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedView) return;
    if (selectedView === "list" && !selectedListId) return;
    completeOnboarding(selectedView, selectedView === "list" ? selectedListId : null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-tr from-[#06060c] via-[#0d0d21] to-[#140b28]">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-pink-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl relative">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-2.5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white shadow-xl shadow-[var(--accent-glow)] select-none">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome to TaskFlow AI
            </h1>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
              One last step — set up your workspace
            </p>
            <p className="text-sm text-gray-400 mt-2 max-w-md">
              What would you like to see first when you open the app? Pick a home screen layout that fits your workflow.
            </p>
          </div>
        </div>

        {/* View Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {VIEW_OPTIONS.map((option) => {
            const isSelected = selectedView === option.id;
            return (
              <button
                key={option.id}
                onClick={() => {
                  setSelectedView(option.id);
                  if (option.id !== "list") setSelectedListId(null);
                }}
                className={`p-5 rounded-xl border-2 text-left transition-all group ${
                  isSelected
                    ? "border-[#facc15] bg-[#facc15]/10 shadow-[0_0_20px_rgba(250,204,21,0.15)]"
                    : "border-gray-700/50 bg-white/5 hover:border-gray-500 hover:bg-white/10"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
                  isSelected 
                    ? "bg-[#facc15] text-black" 
                    : "bg-gray-800 text-gray-400 group-hover:text-gray-200"
                }`}>
                  {option.icon}
                </div>
                <h3 className={`font-bold text-sm mb-1 ${
                  isSelected ? "text-[#facc15]" : "text-gray-200"
                }`}>
                  {option.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {option.desc}
                </p>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#facc15] flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* List Picker (shown when "Single List Focus" is selected) */}
        {selectedView === "list" && (
          <div className="mb-8 p-5 rounded-xl border-2 border-[#facc15]/30 bg-[#facc15]/5">
            <label className="text-sm font-bold text-gray-200 block mb-2">
              Which list do you want as your home view?
            </label>
            <select
              value={selectedListId || ""}
              onChange={(e) => setSelectedListId(e.target.value || null)}
              className="w-full bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#facc15] cursor-pointer"
            >
              <option value="">Select a list...</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.icon} {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedView || (selectedView === "list" && !selectedListId)}
          className="w-full btn-primary h-14 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          <span>Launch My Workspace</span>
        </button>

        <p className="text-center text-[11px] font-medium text-gray-600 mt-6">
          You can always change this later in Settings
        </p>
      </div>
    </div>
  );
}
