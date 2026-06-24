/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { TaskFlowProvider, useTaskFlow } from "./store/stateContext";
import ListSidebar from "./components/ListSidebar";
import CreateListModal from "./components/CreateListModal";
import TaskForm from "./components/TaskForm";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import StatsPage from "./pages/StatsPage";
import TodayPage from "./pages/TodayPage";
import ListPage from "./pages/ListPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import { 
  Menu, 
  Search, 
  Plus, 
  Moon, 
  Sun
} from "lucide-react";
import type { TaskList } from "./types";

function AppContent() {
  const { 
    profile, 
    theme, 
    colorMode, 
    isTaskFormOpen, 
    editingTaskId, 
    openTaskForm, 
    closeTaskForm,
    setColorMode,
    setTheme
  } = useTaskFlow();

  // Navigation state: "dashboard" | "stats" | "today" | "list" | "search" | "settings"
  const [currentView, setCurrentView] = useState<string>(
    profile?.home_view || "dashboard"
  );
  
  // Custom List Modal controllers
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);

  // Mobile navigation sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Keyboard Shortcuts implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts if user is currently typing inside interactive form inputs
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName) || activeEl.getAttribute("contenteditable") === "true") {
          return;
        }
      }

      // 1. N -> Add/Create New Task
      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openTaskForm();
      }

      // 2. / -> Navigate to Search View
      if (e.key === "/") {
        e.preventDefault();
        setCurrentView("search");
      }

      // 3. Cmd/Ctrl + , -> Settings Preferences
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCurrentView("settings");
      }

      // 4. Escape -> Close Modals or Drawer
      if (e.key === "Escape") {
        closeTaskForm();
        setIsListModalOpen(false);
        setEditingList(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openTaskForm, closeTaskForm]);

  // Apply theme attributes to root HTML or body
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-color", colorMode);
  }, [theme, colorMode]);

  // Sync currentView to the user's chosen home view whenever profile loads/changes
  useEffect(() => {
    if (profile?.onboarding_complete && profile.home_view) {
      setCurrentView(profile.home_view);
    }
  }, [profile?.onboarding_complete, profile?.home_view]);

  // Route/View renderer switcher
  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <DashboardPage 
            onNavigate={(view) => {
              setCurrentView(view);
              setIsMobileSidebarOpen(false);
            }} 
            onOpenCreateList={() => {
              setEditingList(null);
              setIsListModalOpen(true);
            }}
          />
        );
      case "stats":
        return <StatsPage />;
      case "today":
        return <TodayPage />;
      case "list":
        return <ListPage />;
      case "search":
        return <SearchPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <DashboardPage 
            onNavigate={(view) => {
              setCurrentView(view);
              setIsMobileSidebarOpen(false);
            }} 
            onOpenCreateList={() => {
              setEditingList(null);
              setIsListModalOpen(true);
            }}
          />
        );
    }
  };

  // If user profile session does not exist, force LoginPage view
  if (!profile) {
    return <LoginPage />;
  }

  // First-time user onboarding — ask what they want on their home screen
  if (!profile.onboarding_complete) {
    return <OnboardingPage />;
  }

  return (
    <div className="min-h-screen flex text-[var(--text-primary)] relative bg-[var(--bg-primary)] transition-all duration-300">
      
      {/* 1. Large Screen Sidebar */}
      <div className="hidden md:block">
        <ListSidebar 
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
          }}
          onOpenCreateList={() => {
            setEditingList(null);
            setIsListModalOpen(true);
          }}
          onOpenEditList={(list) => {
            setEditingList(list);
            setIsListModalOpen(true);
          }}
        />
      </div>

      {/* 2. Mobile Nav Drawer Sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 flex flex-col w-64 h-full bg-[var(--bg-secondary)] border-r border-[var(--border)] animate-slide-in-left">
            <ListSidebar 
              currentView={currentView}
              onNavigate={(view) => {
                setCurrentView(view);
                setIsMobileSidebarOpen(false);
              }}
              onOpenCreateList={() => {
                setEditingList(null);
                setIsMobileSidebarOpen(false);
                setIsListModalOpen(true);
              }}
              onOpenEditList={(list) => {
                setEditingList(list);
                setIsMobileSidebarOpen(false);
                setIsListModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Main Central App Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top bar header */}
        <header className="h-16 border-b-4 border-[var(--border)] px-4 sm:px-6 flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-30 font-sans">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger menu */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 md:hidden text-[var(--text-secondary)] border-2 border-[var(--border)] hover:bg-[var(--bg-card-hover)] rounded-none transition-all"
              title="Open Navigation"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>

            {/* Path details */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)]">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-[var(--text-primary)]">{currentView}</span>
            </div>
          </div>

          {/* User notifications & settings summary shortcuts */}
          <div className="flex items-center gap-3">
            
            {/* Quick search button */}
            <button
              onClick={() => setCurrentView("search")}
              className="p-2 text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border-2 border-[var(--border)] rounded-none bg-[var(--bg-secondary)] shadow-[2px_2px_0px_0px_var(--border)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all hidden sm:block"
              title="Search shortcuts"
            >
              <Search className="w-4.5 h-4.5 text-[var(--text-primary)]" />
            </button>

            {/* Quick add trigger button */}
            <button
              onClick={() => openTaskForm()}
              className="p-2 text-black hover:bg-[var(--bg-card-hover)] border-2 border-[var(--border)] rounded-none bg-[#facc15] shadow-[2px_2px_0px_0px_var(--border)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              title="Quick Add Task"
            >
              <Plus className="w-4.5 h-4.5 text-black font-black" />
            </button>

            {/* Dark/Light mode quick switch */}
            <button
              onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
              className="p-2 text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border-2 border-[var(--border)] rounded-none bg-[var(--bg-secondary)] shadow-[2px_2px_0px_0px_var(--border)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              title={colorMode === "dark" ? "Activate light mode" : "Activate dark mode"}
            >
              {colorMode === "dark" ? (
                <Sun className="w-4.5 h-4.5 text-amber-500" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-500" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable central content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 max-w-4xl w-full mx-auto pb-24">
          {renderView()}
        </main>
      </div>

      {/* Drawer: Add/Edit Task Form */}
      <TaskForm 
        isOpen={isTaskFormOpen} 
        onClose={closeTaskForm} 
        editingTaskId={editingTaskId} 
      />

      {/* Modal: Create/Edit Custom List */}
      <CreateListModal 
        isOpen={isListModalOpen} 
        onClose={() => {
          setIsListModalOpen(false);
          setEditingList(null);
        }}
        editingList={editingList}
      />

    </div>
  );
}

export default function App() {
  return (
    <TaskFlowProvider>
      <AppContent />
    </TaskFlowProvider>
  );
}
