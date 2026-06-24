/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Task, TaskList, UserProfile, Theme, ColorMode, Priority, Subtask, HomeView } from "../types";

interface TaskFlowContextType {
  profile: UserProfile | null;
  login: (email: string) => void;
  verifyOTP: (email: string, code: string) => boolean;
  logout: () => void;
  lists: TaskList[];
  activeListId: string | null; // null represents "All Tasks"
  setActiveListId: (id: string | null) => void;
  createList: (name: string, icon: string, color: string) => void;
  updateList: (id: string, name: string, icon: string, color: string) => void;
  deleteList: (id: string) => void;
  tasks: Task[];
  createTask: (payload: {
    title: string;
    list_id: string | null;
    notes: string | null;
    due_date: string | null;
    priority: Priority;
    tags: string[];
  }) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  theme: Theme;
  colorMode: ColorMode;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  isTaskFormOpen: boolean;
  editingTaskId: string | null;
  openTaskForm: (taskId?: string) => void;
  closeTaskForm: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  completeOnboarding: (homeView: HomeView, homeListId: string | null) => void;
  resetState: () => void;
}

const TaskFlowContext = createContext<TaskFlowContextType | undefined>(undefined);

const SYNC_CHANNEL_NAME = "taskflow_tabs_sync";

const DEFAULT_LISTS: TaskList[] = [
  {
    id: "list-inbox",
    name: "Inbox",
    icon: "📥",
    color: "#6366f1",
    sort_order: 0,
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "list-work",
    name: "Work",
    icon: "💼",
    color: "#3b82f6",
    sort_order: 1,
    is_default: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "list-personal",
    name: "Personal",
    icon: "💖",
    color: "#ec4899",
    sort_order: 2,
    is_default: false,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    list_id: "list-inbox",
    title: "Welcome to TaskFlow AI! 👋",
    notes: "This is your starting todo item. Double-click or click Edit to see more details.",
    due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
    priority: "high",
    status: "todo",
    tags: ["welcome", "guide"],
    sort_order: 0,
    completed_at: null,
    created_at: new Date().toISOString(),
    subtasks: [
      { id: "sub-1", title: "Complete this subtask", completed: false },
      { id: "sub-2", title: "Create a new named list", completed: false },
      { id: "sub-3", title: "Explore settings panel", completed: false },
    ],
  },
  {
    id: "task-2",
    list_id: "list-work",
    title: "Review project milestones",
    notes: "Focus on Phase 1 deliverables and ensure everything works perfectly.",
    due_date: null,
    priority: "medium",
    status: "todo",
    tags: ["work", "milestones"],
    sort_order: 1,
    completed_at: null,
    created_at: new Date().toISOString(),
    subtasks: [],
  },
];

export function TaskFlowProvider({ children }: { children: React.ReactNode }) {
  // --- STATE HOOKS ---
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem("tf_profile");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Backward compatibility: fill defaults for existing profiles missing new fields
    if (parsed.onboarding_complete === undefined) {
      parsed.onboarding_complete = true; // existing users already onboarded
      parsed.home_view = parsed.home_view || "dashboard";
      parsed.home_list_id = parsed.home_list_id || null;
      localStorage.setItem("tf_profile", JSON.stringify(parsed));
    }
    return parsed;
  });

  const [lists, setLists] = useState<TaskList[]>(() => {
    const stored = localStorage.getItem("tf_lists");
    return stored ? JSON.parse(stored) : DEFAULT_LISTS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem("tf_tasks");
    return stored ? JSON.parse(stored) : DEFAULT_TASKS;
  });

  const [activeListId, setActiveListId] = useState<string | null>(() => {
    return localStorage.getItem("tf_active_list_id") || null;
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("tf_theme") as Theme) || "glass";
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem("tf_color_mode") as ColorMode) || "dark";
  });

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- TAB SYNC CHANNEL ---
  useEffect(() => {
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);

    const handleSyncMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (type === "SYNC_DATA") {
        if (data.profile !== undefined) setProfile(data.profile);
        if (data.lists !== undefined) setLists(data.lists);
        if (data.tasks !== undefined) setTasks(data.tasks);
        if (data.theme !== undefined) setThemeState(data.theme);
        if (data.colorMode !== undefined) setColorModeState(data.colorMode);
      }
    };

    channel.addEventListener("message", handleSyncMessage);
    return () => {
      channel.removeEventListener("message", handleSyncMessage);
      channel.close();
    };
  }, []);

  const broadcastChange = (data: {
    profile?: UserProfile | null;
    lists?: TaskList[];
    tasks?: Task[];
    theme?: Theme;
    colorMode?: ColorMode;
  }) => {
    try {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage({ type: "SYNC_DATA", data });
      channel.close();
    } catch (e) {
      console.warn("BroadcastChannel sync error:", e);
    }
  };

  // --- STORAGE WRAPPER & PERSISTENCE ---
  const saveProfile = (newProfile: UserProfile | null) => {
    setProfile(newProfile);
    if (newProfile) {
      localStorage.setItem("tf_profile", JSON.stringify(newProfile));
    } else {
      localStorage.removeItem("tf_profile");
    }
    broadcastChange({ profile: newProfile });
  };

  const saveLists = (newLists: TaskList[]) => {
    setLists(newLists);
    localStorage.setItem("tf_lists", JSON.stringify(newLists));
    broadcastChange({ lists: newLists });
  };

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem("tf_tasks", JSON.stringify(newTasks));
    broadcastChange({ tasks: newTasks });
  };

  const saveActiveListId = (id: string | null) => {
    setActiveListId(id);
    if (id) {
      localStorage.setItem("tf_active_list_id", id);
    } else {
      localStorage.removeItem("tf_active_list_id");
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("tf_theme", newTheme);
    broadcastChange({ theme: newTheme });
  };

  const setColorMode = (newMode: ColorMode) => {
    setColorModeState(newMode);
    localStorage.setItem("tf_color_mode", newMode);
    broadcastChange({ colorMode: newMode });
  };

  // --- AUTH METHODS ---
  const login = (email: string) => {
    // Generate simple profile placeholder to allow login instantly
    // We send a mock OTP to console or show a 6-digit confirmation
    console.log(`[TaskFlow AI] Simulated OTP sent to: ${email}`);
  };

  const verifyOTP = (email: string, code: string): boolean => {
    // Standard mock verification (any 6 digits or specific ones work)
    if (code.length === 6) {
      // Check if a profile backup exists for this email (from a prior logout)
      const backupKey = `tf_profile_backup_${email}`;
      const storedBackup = localStorage.getItem(backupKey);
      if (storedBackup) {
        // Restore the previous profile for the same email
        const restoredProfile: UserProfile = JSON.parse(storedBackup);
        saveProfile(restoredProfile);
        localStorage.removeItem(backupKey); // clean up
        return true;
      }

      // No backup exists — create a fresh profile
      const display = email.split("@")[0];
      const newProfile: UserProfile = {
        id: "usr-" + Math.random().toString(36).substr(2, 9),
        email,
        display_name: display.charAt(0).toUpperCase() + display.slice(1),
        theme,
        color_mode: colorMode,
        created_at: new Date().toISOString(),
        onboarding_complete: false,
        home_view: "dashboard",
        home_list_id: null,
      };
      saveProfile(newProfile);
      return true;
    }
    return false;
  };

  const logout = () => {
    // Archive the profile keyed by email so it can be restored on re-login
    if (profile) {
      try {
        localStorage.setItem(
          `tf_profile_backup_${profile.email}`,
          JSON.stringify(profile)
        );
      } catch (e) {
        console.warn("Failed to archive profile backup:", e);
      }
    }
    saveProfile(null);
    saveActiveListId(null);
  };

  // --- LISTS METHODS ---
  const createList = (name: string, icon: string, color: string) => {
    const newList: TaskList = {
      id: "list-" + Math.random().toString(36).substr(2, 9),
      name,
      icon: icon || "📋",
      color: color || "#6366f1",
      sort_order: lists.length,
      is_default: false,
      created_at: new Date().toISOString(),
    };
    saveLists([...lists, newList]);
  };

  const updateList = (id: string, name: string, icon: string, color: string) => {
    const updated = lists.map((l) =>
      l.id === id ? { ...l, name, icon, color } : l
    );
    saveLists(updated);
  };

  const deleteList = (id: string) => {
    // Filter out the list
    const filteredLists = lists.filter((l) => l.id !== id);
    saveLists(filteredLists);

    // Set tasks in this list to have null list_id (Inbox/uncategorized)
    const updatedTasks = tasks.map((t) =>
      t.list_id === id ? { ...t, list_id: null } : t
    );
    saveTasks(updatedTasks);

    // If active list was deleted, redirect active list to null (All)
    if (activeListId === id) {
      saveActiveListId(null);
    }
  };

  // --- TASKS METHODS ---
  const createTask = (payload: {
    title: string;
    list_id: string | null;
    notes: string | null;
    due_date: string | null;
    priority: Priority;
    tags: string[];
  }) => {
    const newTask: Task = {
      id: "task-" + Math.random().toString(36).substr(2, 9),
      list_id: payload.list_id,
      title: payload.title,
      notes: payload.notes,
      due_date: payload.due_date,
      priority: payload.priority,
      status: "todo",
      tags: payload.tags,
      sort_order: tasks.length,
      completed_at: null,
      created_at: new Date().toISOString(),
      subtasks: [],
    };
    saveTasks([newTask, ...tasks]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const merged = { ...t, ...updates };
        if (updates.status === "done" && t.status !== "done") {
          merged.completed_at = new Date().toISOString();
        } else if (updates.status === "todo") {
          merged.completed_at = null;
        }
        return merged;
      }
      return t;
    });
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id));
    if (editingTaskId === id) {
      closeTaskForm();
    }
  };

  // --- ONBOARDING ---
  const completeOnboarding = (homeView: HomeView, homeListId: string | null) => {
    if (profile) {
      const updated: UserProfile = {
        ...profile,
        onboarding_complete: true,
        home_view: homeView,
        home_list_id: homeListId,
      };
      saveProfile(updated);
      // If onboarding with a specific list, set it as the active list
      if (homeView === "list" && homeListId) {
        saveActiveListId(homeListId);
      }
    }
  };

  // --- DEV RESET ---
  const resetState = () => {
    // Clear all localStorage keys used by the app
    localStorage.removeItem("tf_profile");
    localStorage.removeItem("tf_lists");
    localStorage.removeItem("tf_tasks");
    localStorage.removeItem("tf_active_list_id");
    localStorage.removeItem("tf_theme");
    localStorage.removeItem("tf_color_mode");
    // Force a full page reload to re-initialise all state from scratch
    window.location.reload();
  };

  // --- UI CONTROLS ---
  const openTaskForm = (taskId?: string) => {
    setEditingTaskId(taskId || null);
    setIsTaskFormOpen(true);
  };

  const closeTaskForm = () => {
    setIsTaskFormOpen(false);
    setEditingTaskId(null);
  };

  return (
    <TaskFlowContext.Provider
      value={{
        profile,
        login,
        verifyOTP,
        logout,
        lists,
        activeListId,
        setActiveListId: saveActiveListId,
        createList,
        updateList,
        deleteList,
        tasks,
        createTask,
        updateTask,
        deleteTask,
        theme,
        colorMode,
        setTheme,
        setColorMode,
        isTaskFormOpen,
        editingTaskId,
        openTaskForm,
        closeTaskForm,
        searchQuery,
        setSearchQuery,
        completeOnboarding,
        resetState,
      }}
    >
      {children}
    </TaskFlowContext.Provider>
  );
}

export function useTaskFlow() {
  const context = useContext(TaskFlowContext);
  if (context === undefined) {
    throw new Error("useTaskFlow must be used within a TaskFlowProvider");
  }
  return context;
}
