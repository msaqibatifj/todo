/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { useTaskFlow } from "../store/stateContext";
import { 
  Folder, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  Layers, 
  Calendar,
  Sparkles,
  ChevronRight,
  User,
  Trash2,
  Edit2
} from "lucide-react";
import type { TaskList } from "../types";

interface ListSidebarProps {
  currentView: string;
  onNavigate: (view: string, listId?: string | null) => void;
  onOpenCreateList: () => void;
  onOpenEditList: (list: TaskList) => void;
}

export default function ListSidebar({ 
  currentView, 
  onNavigate, 
  onOpenCreateList,
  onOpenEditList
}: ListSidebarProps) {
  const { 
    profile, 
    lists, 
    tasks, 
    activeListId, 
    setActiveListId,
    deleteList,
    logout 
  } = useTaskFlow();

  const [hoveredListId, setHoveredListId] = useState<string | null>(null);

  // Helper to count active tasks in a specific list
  const getTaskCount = (listId: string | null) => {
    return tasks.filter(t => t.list_id === listId && t.status === "todo").length;
  };

  const getAllActiveCount = () => {
    return tasks.filter(t => t.status === "todo").length;
  };

  const getTodayActiveCount = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return tasks.filter(t => t.status === "todo" && t.due_date && t.due_date.slice(0, 10) === todayStr).length;
  };

  return (
    <aside className="w-64 border-r-4 border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col justify-between h-screen sticky top-0 shrink-0 font-sans">
      {/* Top branding */}
      <div className="p-5 flex flex-col gap-4">
        <div 
          onClick={() => { onNavigate("dashboard"); setActiveListId(null); }}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-none border-2 border-[var(--border)] bg-[var(--accent)] flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all duration-150">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tighter text-[var(--text-primary)] uppercase">TaskFlow AI</h1>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">SYSTEM V4.2.0</span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-col gap-1 mt-2">
          <button 
            id="nav-search"
            onClick={() => onNavigate("search")}
            className={`flex items-center gap-3 px-3 py-2 rounded-none border-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all duration-150 ${currentView === "search" ? "bg-[var(--bg-card-hover)] border-[var(--border)] text-[var(--text-primary)] font-black uppercase" : "border-transparent"}`}
          >
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="font-bold">Search Tasks</span>
            <kbd className="ml-auto text-[10px] bg-[var(--border)] text-[var(--bg-secondary)] px-1.5 py-0.5 font-mono">/</kbd>
          </button>
        </div>
      </div>

      {/* Middle Scrollable Section: Lists & Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {/* Smart Lists */}
        <div>
          <span className="px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-2">Smart Lists</span>
          <div className="space-y-1">
            {/* Dashboard Overview */}
            <button
              id="nav-dashboard"
              onClick={() => { onNavigate("dashboard"); setActiveListId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-none border-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all duration-150 ${currentView === "dashboard" ? "bg-[var(--bg-card-hover)] border-[var(--border)] text-[var(--text-primary)] font-black uppercase" : "border-transparent"}`}
            >
              <Layers className="w-4 h-4 text-[var(--text-primary)]" />
              <span className="font-bold">Dashboard Grid</span>
            </button>

            {/* All Tasks */}
            <button
              id="nav-all"
              onClick={() => { onNavigate("list"); setActiveListId(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-none border-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all duration-150 ${currentView === "list" && activeListId === null ? "bg-[var(--bg-card-hover)] border-[var(--border)] text-[var(--text-primary)] font-black uppercase" : "border-transparent"}`}
            >
              <div className="flex items-center gap-3">
                <Folder className="w-4 h-4 text-[var(--text-primary)]" />
                <span className="font-bold">All Tasks</span>
              </div>
              {getAllActiveCount() > 0 && (
                <span className="text-[10px] font-bold bg-[var(--border)] text-[var(--bg-secondary)] px-2 py-0.5">
                  {getAllActiveCount()}
                </span>
              )}
            </button>

            {/* Today Tasks */}
            <button
              id="nav-today"
              onClick={() => { onNavigate("list"); setActiveListId("today"); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-none border-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all duration-150 ${activeListId === "today" ? "bg-[var(--bg-card-hover)] border-[var(--border)] text-[var(--text-primary)] font-black uppercase" : "border-transparent"}`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[var(--text-primary)]" />
                <span className="font-bold">Today</span>
              </div>
              {getTodayActiveCount() > 0 && (
                <span className="text-[10px] font-bold bg-[#facc15] text-black px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {getTodayActiveCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* User Created Lists */}
        <div>
          <div className="px-3 flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">Custom Lists</span>
            <button 
              onClick={onOpenCreateList}
              className="p-1 rounded-md hover:bg-[var(--border)] text-[var(--text-secondary)] transition-all duration-150"
              title="Create New List"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {lists.map((list) => {
              const isActive = activeListId === list.id && currentView === "list";
              const count = getTaskCount(list.id);
              const isHovered = hoveredListId === list.id;

              return (
                <div
                  key={list.id}
                  onMouseEnter={() => setHoveredListId(list.id)}
                  onMouseLeave={() => setHoveredListId(null)}
                  className="relative group"
                >
                  <button
                    onClick={() => { onNavigate("list"); setActiveListId(list.id); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-none border-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all duration-150 ${isActive ? "bg-[var(--bg-card-hover)] border-[var(--border)] text-[var(--text-primary)] font-black uppercase" : "border-transparent"}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-base select-none shrink-0">{list.icon}</span>
                      <span className="truncate">{list.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isHovered && !list.is_default ? (
                        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-1 border-2 border-[var(--border)] shadow-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEditList(list);
                            }}
                            className="p-0.5 hover:text-indigo-400 rounded transition-colors"
                            title="Edit List"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete the list "${list.name}"? Tasks inside it will be moved to uncategorized.`)) {
                                deleteList(list.id);
                              }
                            }}
                            className="p-0.5 hover:text-red-400 rounded transition-colors"
                            title="Delete List"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        count > 0 && (
                          <span 
                            className="text-[10px] font-bold px-1.5 py-0.5 border-2 border-black bg-white text-black"
                          >
                            {count}
                          </span>
                        )
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t-4 border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col gap-2">
        {profile ? (
          <>
            <div 
              onClick={() => onNavigate("settings")}
              className="flex items-center gap-3 p-2 border-2 border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all duration-150 group"
            >
              <div className="w-10 h-10 rounded-none border-2 border-black bg-[#facc15] flex items-center justify-center text-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all duration-150">
                {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-black" />}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight truncate">{profile.display_name}</div>
                <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">{profile.email}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => onNavigate("settings")}
                className="flex-1 py-1.5 px-2 rounded-none border-2 border-[var(--border)] flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-all duration-150"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">Settings</span>
              </button>
              <button
                onClick={logout}
                className="py-1.5 px-3 rounded-none border-2 border-red-600 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-bold flex items-center justify-center transition-all duration-150"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => onNavigate("login")}
            className="w-full btn-primary text-xs py-2"
          >
            Sign In Account
          </button>
        )}
      </div>
    </aside>
  );
}
