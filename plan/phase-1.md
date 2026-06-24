# TaskFlow AI — Phase 1: Web App
> **Duration:** 4–6 weeks  
> **Goal:** A fully working, deployed web app you use personally every day  
> **Rule:** Do not move to Phase 2 until this is live on Vercel and you've used it for at least one week

---

## Table of Contents

1. [What You're Building](#1-what-youre-building)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Project Setup](#5-project-setup)
6. [Supabase Setup](#6-supabase-setup)
7. [Frontend Implementation](#7-frontend-implementation)
8. [Authentication](#8-authentication)
9. [Task & List CRUD](#9-task--list-crud)
10. [Real-time Sync](#10-real-time-sync)
11. [UI & Design System](#11-ui--design-system)
12. [Folder Structure](#12-folder-structure)
13. [Environment Variables](#13-environment-variables)
14. [Deployment](#14-deployment)
15. [Definition of Done](#15-definition-of-done)

---

## 1. What You're Building

A clean, fast, cloud-synced todo web app. No AI yet. No mobile yet. No widgets. Just solid core functionality that works perfectly.

### Features in Phase 1

- Email OTP login (no passwords)
- Multiple named lists (Inbox, Work, Personal, etc.)
- Create, edit, complete, delete tasks
- Task properties: title, notes, due date, priority, tags
- Subtasks (checklist inside a task)
- Drag-and-drop task reordering
- Real-time sync across browser tabs
- Glassmorphism UI with dark/light mode
- Keyboard shortcuts
- Search across all tasks
- Deployed and accessible from any browser

### What is NOT in Phase 1

- Mobile app (Phase 2)
- AI features (Phase 3)
- Desktop app (Phase 4)
- Widget or lock screen (Phase 4)
- Neumorphism theme (Phase 4)
- QR code linking (Phase 3)
- Export features (Phase 4)
- Collaboration / sharing (Phase 4)

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.x | Core UI framework |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 5.x | Build tool and dev server |
| **React Router DOM** | 6.x | Client-side routing |
| **Zustand** | 4.x | Global state management |
| **TanStack Query** | 5.x | Server state, caching, background refetch |
| **React Hook Form** | 7.x | Form state management |
| **Zod** | 3.x | Schema validation |
| **date-fns** | 3.x | Date formatting and manipulation |
| **@dnd-kit/core + @dnd-kit/sortable** | latest | Drag-and-drop reordering |
| **Framer Motion** | 11.x | Animations and transitions |
| **Lucide React** | latest | Icons |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **clsx + tailwind-merge** | latest | Conditional class merging |

### Backend

| Technology | Purpose |
|---|---|
| **Supabase** | Entire backend platform |
| **PostgreSQL 15** | Primary database (via Supabase) |
| **Supabase Auth** | OTP email authentication |
| **Supabase Realtime** | Live sync via WebSockets |
| **Supabase Row Level Security** | Per-user data isolation |
| **@supabase/supabase-js** | Frontend SDK |

### DevOps

| Technology | Purpose |
|---|---|
| **Vercel** | Frontend hosting |
| **GitHub** | Version control |
| **GitHub Actions** | CI/CD auto-deploy on push |
| **ESLint + Prettier** | Code quality |
| **Vitest** | Unit testing |

---

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│              BROWSER (React App)             │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Zustand │  │  TanStack│  │  React    │  │
│  │  Store   │  │  Query   │  │  Router   │  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  │
│       └─────────────┘                        │
│                 │                            │
│       ┌─────────▼──────────┐                 │
│       │  Supabase JS Client│                 │
│       └─────────┬──────────┘                 │
└─────────────────┼───────────────────────────┘
                  │
    ┌─────────────▼─────────────┐
    │         SUPABASE          │
    │                           │
    │  ┌──────────────────────┐ │
    │  │  PostgreSQL + RLS    │ │
    │  ├──────────────────────┤ │
    │  │  Supabase Auth (OTP) │ │
    │  ├──────────────────────┤ │
    │  │  Realtime (WS)       │ │
    │  └──────────────────────┘ │
    └───────────────────────────┘
```

### Data Flow

```
User Action → React Component → Zustand Action
    → Supabase JS Client → PostgreSQL
    → Supabase Realtime broadcasts change
    → All open tabs update instantly
```

---

## 4. Database Schema

### Full SQL — Run in Supabase SQL Editor

```sql
-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  theme         TEXT DEFAULT 'glass' CHECK (theme IN ('glass', 'minimal')),
  color_mode    TEXT DEFAULT 'dark'  CHECK (color_mode IN ('dark', 'light', 'system')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- LISTS
-- ============================================
CREATE TABLE public.lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '📋',
  color       TEXT DEFAULT '#6366f1',
  sort_order  INTEGER DEFAULT 0,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  list_id       UUID REFERENCES public.lists(id) ON DELETE SET NULL,
  parent_id     UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  notes         TEXT,
  due_date      TIMESTAMPTZ,
  priority      TEXT DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent')),
  status        TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
  tags          TEXT[] DEFAULT '{}',
  sort_order    INTEGER DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks     ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Lists
CREATE POLICY "Users manage own lists"
  ON public.lists FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users manage own tasks"
  ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lists;

-- ============================================
-- INDEXES (performance)
-- ============================================
CREATE INDEX idx_tasks_user_id    ON public.tasks(user_id);
CREATE INDEX idx_tasks_list_id    ON public.tasks(list_id);
CREATE INDEX idx_tasks_status     ON public.tasks(status);
CREATE INDEX idx_tasks_due_date   ON public.tasks(due_date);
CREATE INDEX idx_tasks_parent_id  ON public.tasks(parent_id);
CREATE INDEX idx_lists_user_id    ON public.lists(user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

---

## 5. Project Setup

### Initialize Project

```bash
# Create project
npm create vite@latest taskflow-web -- --template react-ts
cd taskflow-web

# Install all dependencies
npm install \
  @supabase/supabase-js \
  @tanstack/react-query \
  @tanstack/react-query-devtools \
  zustand \
  react-router-dom \
  react-hook-form \
  @hookform/resolvers \
  zod \
  date-fns \
  @dnd-kit/core \
  @dnd-kit/sortable \
  @dnd-kit/utilities \
  framer-motion \
  lucide-react \
  clsx \
  tailwind-merge

# Dev dependencies
npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  @types/node \
  vitest \
  @testing-library/react \
  eslint \
  prettier \
  eslint-config-prettier

# Init Tailwind
npx tailwindcss init -p

# Generate Supabase types (run after DB setup)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
});
```

### Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "monospace"]
      },
      colors: {
        accent: {
          DEFAULT: "#6366f1",
          hover:   "#5558e8",
          glow:    "rgba(99,102,241,0.35)"
        }
      },
      backdropBlur: { glass: "20px" },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4,0,0.6,1) infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
```

---

## 6. Supabase Setup

### Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  }
);
```

### TypeScript Types

```typescript
// src/types/index.ts
export type Priority = "none" | "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type Theme = "glass" | "minimal";
export type ColorMode = "dark" | "light" | "system";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  theme: Theme;
  color_mode: ColorMode;
  created_at: string;
}

export interface TaskList {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  list_id: string | null;
  parent_id: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  tags: string[];
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: Task[]; // client-side computed
}
```

---

## 7. Frontend Implementation

### Global State — Zustand

```typescript
// src/store/useAppStore.ts
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { Task, TaskList, UserProfile, Theme, ColorMode } from "@/types";

interface AppStore {
  // Auth
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;

  // Lists
  lists: TaskList[];
  activeListId: string | null;
  setLists: (l: TaskList[]) => void;
  setActiveList: (id: string | null) => void;
  upsertList: (list: TaskList) => void;
  removeList: (id: string) => void;

  // Tasks
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  upsertTask: (task: Task) => void;
  removeTask: (id: string) => void;

  // UI
  theme: Theme;
  colorMode: ColorMode;
  setTheme: (t: Theme) => void;
  setColorMode: (m: ColorMode) => void;
  isTaskFormOpen: boolean;
  editingTaskId: string | null;
  openTaskForm: (taskId?: string) => void;
  closeTaskForm: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        profile: null,
        setProfile: (profile) => set({ profile }),

        lists: [],
        activeListId: null,
        setLists: (lists) => set({ lists }),
        setActiveList: (activeListId) => set({ activeListId }),
        upsertList: (list) => set((s) => ({
          lists: s.lists.find(l => l.id === list.id)
            ? s.lists.map(l => l.id === list.id ? list : l)
            : [...s.lists, list]
        })),
        removeList: (id) => set((s) => ({ lists: s.lists.filter(l => l.id !== id) })),

        tasks: [],
        setTasks: (tasks) => set({ tasks }),
        upsertTask: (task) => set((s) => ({
          tasks: s.tasks.find(t => t.id === task.id)
            ? s.tasks.map(t => t.id === task.id ? task : t)
            : [task, ...s.tasks]
        })),
        removeTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),

        theme: "glass",
        colorMode: "system",
        setTheme: (theme) => set({ theme }),
        setColorMode: (colorMode) => set({ colorMode }),

        isTaskFormOpen: false,
        editingTaskId: null,
        openTaskForm: (taskId) => set({ isTaskFormOpen: true, editingTaskId: taskId ?? null }),
        closeTaskForm: () => set({ isTaskFormOpen: false, editingTaskId: null }),

        searchQuery: "",
        setSearchQuery: (searchQuery) => set({ searchQuery })
      }),
      {
        name: "taskflow-store",
        partialize: (s) => ({
          theme: s.theme,
          colorMode: s.colorMode,
          activeListId: s.activeListId
        })
      }
    )
  )
);
```

### TanStack Query — Data Fetching

```typescript
// src/hooks/useLists.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import type { TaskList } from "@/types";

export function useLists() {
  const { setLists } = useAppStore();

  return useQuery({
    queryKey: ["lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setLists(data as TaskList[]);
      return data as TaskList[];
    }
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; icon: string; color: string }) => {
      const { data, error } = await supabase.from("lists").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] })
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] })
  });
}
```

```typescript
// src/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Task, Priority, TaskStatus } from "@/types";

export function useTasks(listId?: string | null) {
  return useQuery({
    queryKey: ["tasks", listId],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*")
        .is("parent_id", null) // only top-level tasks
        .order("sort_order", { ascending: true });

      if (listId) query = query.eq("list_id", listId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    }
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      list_id?: string;
      priority?: Priority;
      due_date?: string;
      notes?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] })
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] })
  });
}

export function useCompleteTask() {
  const updateTask = useUpdateTask();
  return {
    ...updateTask,
    mutate: (id: string) => updateTask.mutate({
      id,
      status: "done",
      completed_at: new Date().toISOString()
    })
  };
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] })
  });
}
```

---

## 8. Authentication

### Auth Hook

```typescript
// src/hooks/useAuth.ts
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const { setProfile } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await fetchProfile(session.user.id);
          navigate("/");
        }
        if (event === "SIGNED_OUT") {
          setProfile(null);
          navigate("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  }
}

// OTP send
export async function sendOTP(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
  });
  if (error) throw error;
}

// OTP verify
export async function verifyOTP(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email"
  });
  if (error) throw error;
}

// Sign out
export async function signOut() {
  await supabase.auth.signOut();
}
```

### Login Page

```typescript
// src/pages/LoginPage.tsx
import { useState } from "react";
import { sendOTP, verifyOTP } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const emailSchema = z.object({ email: z.string().email("Invalid email") });
const otpSchema   = z.object({ otp:   z.string().length(6, "OTP must be 6 digits") });

export function LoginPage() {
  const [step, setStep]     = useState<"email" | "otp">("email");
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const otpForm   = useForm({ resolver: zodResolver(otpSchema) });

  async function handleSendOTP({ email }: { email: string }) {
    setLoading(true);
    setError(null);
    try {
      await sendOTP(email);
      setEmail(email);
      setStep("otp");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP({ otp }: { otp: string }) {
    setLoading(true);
    setError(null);
    try {
      await verifyOTP(email, otp);
      // auth state listener in useAuth handles redirect
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="card-glass w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          TaskFlow AI
        </h1>
        <p className="text-[var(--text-muted)] mb-8 text-sm">
          {step === "email" ? "Enter your email to continue" : `Code sent to ${email}`}
        </p>

        {step === "email" ? (
          <form onSubmit={emailForm.handleSubmit(handleSendOTP)}>
            <input
              {...emailForm.register("email")}
              type="email"
              placeholder="you@example.com"
              className="input-glass w-full mb-4"
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending..." : "Continue with Email"}
            </button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)}>
            <input
              {...otpForm.register("otp")}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="input-glass w-full mb-4 text-center text-2xl tracking-widest"
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="btn-ghost w-full mt-2"
            >
              Use different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

---

## 9. Task & List CRUD

### Task Form Component

```typescript
// src/components/tasks/TaskForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useLists } from "@/hooks/useLists";
import { useAppStore } from "@/store/useAppStore";
import type { Priority } from "@/types";

const schema = z.object({
  title:    z.string().min(1, "Title is required").max(255),
  notes:    z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]),
  list_id:  z.string().optional(),
  tags:     z.string().optional() // comma-separated
});

type FormData = z.infer<typeof schema>;

export function TaskForm() {
  const { closeTaskForm, editingTaskId, tasks, activeListId } = useAppStore();
  const editingTask = tasks.find(t => t.id === editingTaskId);
  const { data: lists = [] } = useLists();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:    editingTask?.title    ?? "",
      notes:    editingTask?.notes    ?? "",
      due_date: editingTask?.due_date ?? "",
      priority: editingTask?.priority ?? "none",
      list_id:  editingTask?.list_id  ?? activeListId ?? "",
      tags:     editingTask?.tags?.join(", ") ?? ""
    }
  });

  async function onSubmit(data: FormData) {
    const payload = {
      ...data,
      tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      due_date: data.due_date || undefined
    };

    if (editingTask) {
      await updateTask.mutateAsync({ id: editingTask.id, ...payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    closeTaskForm();
  }

  const priorityColors: Record<Priority, string> = {
    none:   "text-gray-400",
    low:    "text-green-400",
    medium: "text-amber-400",
    high:   "text-orange-400",
    urgent: "text-red-400"
  };

  return (
    <div className="card-glass p-6 w-full max-w-lg">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        {editingTask ? "Edit Task" : "New Task"}
      </h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <input
          {...form.register("title")}
          placeholder="Task title"
          className="input-glass w-full"
          autoFocus
        />

        <textarea
          {...form.register("notes")}
          placeholder="Notes (optional)"
          rows={3}
          className="input-glass w-full resize-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Due date</label>
            <input
              {...form.register("due_date")}
              type="datetime-local"
              className="input-glass w-full"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Priority</label>
            <select {...form.register("priority")} className="input-glass w-full">
              {(["none", "low", "medium", "high", "urgent"] as Priority[]).map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">List</label>
          <select {...form.register("list_id")} className="input-glass w-full">
            <option value="">No list</option>
            {lists.map(l => (
              <option key={l.id} value={l.id}>{l.icon} {l.name}</option>
            ))}
          </select>
        </div>

        <input
          {...form.register("tags")}
          placeholder="Tags: work, urgent, project-x"
          className="input-glass w-full"
        />

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            {editingTask ? "Save Changes" : "Add Task"}
          </button>
          <button type="button" onClick={closeTaskForm} className="btn-ghost flex-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## 10. Real-time Sync

```typescript
// src/hooks/useRealtimeSync.ts
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { useQueryClient } from "@tanstack/react-query";
import type { Task, TaskList } from "@/types";

export function useRealtimeSync(userId: string) {
  const { upsertTask, removeTask, upsertList, removeList } = useAppStore();
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`user:${userId}`)
      // Tasks
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "tasks",
        filter: `user_id=eq.${userId}`
      }, ({ new: task }) => {
        upsertTask(task as Task);
        qc.invalidateQueries({ queryKey: ["tasks"] });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "tasks",
        filter: `user_id=eq.${userId}`
      }, ({ new: task }) => {
        upsertTask(task as Task);
        qc.invalidateQueries({ queryKey: ["tasks"] });
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "tasks",
        filter: `user_id=eq.${userId}`
      }, ({ old: task }) => {
        removeTask(task.id);
        qc.invalidateQueries({ queryKey: ["tasks"] });
      })
      // Lists
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "lists",
        filter: `user_id=eq.${userId}`
      }, ({ new: list }) => upsertList(list as TaskList))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "lists",
        filter: `user_id=eq.${userId}`
      }, ({ new: list }) => upsertList(list as TaskList))
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "lists",
        filter: `user_id=eq.${userId}`
      }, ({ old: list }) => removeList(list.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
```

---

## 11. UI & Design System

### CSS Variables (Theme System)

```css
/* src/styles/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── GLASSMORPHISM DARK ─────────────────────── */
:root,
[data-theme="glass"][data-color="dark"] {
  --bg-primary:     #0a0a14;
  --bg-secondary:   #0f0f1f;
  --bg-card:        rgba(255, 255, 255, 0.04);
  --bg-card-hover:  rgba(255, 255, 255, 0.08);
  --border:         rgba(255, 255, 255, 0.07);
  --blur:           blur(20px);
  --accent:         #6366f1;
  --accent-hover:   #5558e8;
  --accent-glow:    rgba(99, 102, 241, 0.3);
  --text-primary:   rgba(255, 255, 255, 0.92);
  --text-secondary: rgba(255, 255, 255, 0.65);
  --text-muted:     rgba(255, 255, 255, 0.35);
  --shadow:         0 8px 32px rgba(0, 0, 0, 0.5);
  --radius:         16px;
  --radius-sm:      10px;
  --priority-low:    #22c55e;
  --priority-medium: #f59e0b;
  --priority-high:   #f97316;
  --priority-urgent: #ef4444;
}

/* ── GLASSMORPHISM LIGHT ─────────────────────── */
[data-theme="glass"][data-color="light"] {
  --bg-primary:    #f0f2ff;
  --bg-secondary:  #e8eaff;
  --bg-card:       rgba(255, 255, 255, 0.6);
  --bg-card-hover: rgba(255, 255, 255, 0.8);
  --border:        rgba(99, 102, 241, 0.15);
  --text-primary:  rgba(15, 15, 30, 0.92);
  --text-secondary:rgba(15, 15, 30, 0.6);
  --text-muted:    rgba(15, 15, 30, 0.35);
  --shadow:        0 8px 32px rgba(99, 102, 241, 0.1);
}

/* ── COMPONENT CLASSES ──────────────────────── */
@layer components {
  .card-glass {
    @apply rounded-[var(--radius)];
    background: var(--bg-card);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }

  .card-glass:hover {
    background: var(--bg-card-hover);
  }

  .input-glass {
    @apply w-full px-4 py-2.5 rounded-[var(--radius-sm)] text-sm outline-none
           transition-all duration-200;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    color: var(--text-primary);
  }

  .input-glass::placeholder { color: var(--text-muted); }

  .input-glass:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .btn-primary {
    @apply px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium
           text-white transition-all duration-200 disabled:opacity-50;
    background: var(--accent);
  }

  .btn-primary:hover { background: var(--accent-hover); }

  .btn-ghost {
    @apply px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium
           transition-all duration-200;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .btn-ghost:hover { background: var(--bg-card-hover); }

  .priority-badge {
    @apply px-2 py-0.5 rounded-full text-xs font-medium;
  }
}
```

### App Layout & Routing

```typescript
// src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { LoginPage }     from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ListPage }      from "@/pages/ListPage";
import { SearchPage }    from "@/pages/SearchPage";
import { SettingsPage }  from "@/pages/SettingsPage";
import { useAuth }       from "@/hooks/useAuth";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2
    }
  }
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { profile } = useAppStore();
  useAuth();
  if (!profile) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { theme, colorMode } = useAppStore();

  return (
    <div data-theme={theme} data-color={colorMode === "system" ? "dark" : colorMode}>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AuthGate><DashboardPage /></AuthGate>} />
            <Route path="/list/:listId" element={<AuthGate><ListPage /></AuthGate>} />
            <Route path="/search" element={<AuthGate><SearchPage /></AuthGate>} />
            <Route path="/settings" element={<AuthGate><SettingsPage /></AuthGate>} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </div>
  );
}
```

### Keyboard Shortcuts

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const { openTaskForm, setSearchQuery } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire in inputs
      if (["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === "n" && !e.metaKey && !e.ctrlKey) openTaskForm();       // N → new task
      if (e.key === "/" ) { e.preventDefault(); navigate("/search"); }      // / → search
      if (e.key === "Escape") { /* handled per-component */ }               // Esc → close modals
      if (e.key === "," && (e.metaKey || e.ctrlKey)) navigate("/settings"); // Cmd+, → settings
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
```

---

## 12. Folder Structure

```
taskflow-web/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── components/
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx        — Task row with priority, due date, complete btn
│   │   │   ├── TaskList.tsx        — DnD sortable list of TaskCards
│   │   │   ├── TaskForm.tsx        — Add/edit drawer
│   │   │   ├── SubtaskList.tsx     — Nested checklist inside a task
│   │   │   └── TaskContextMenu.tsx — Right-click menu (edit, delete, move)
│   │   │
│   │   ├── lists/
│   │   │   ├── ListSidebar.tsx     — Left nav with all named lists
│   │   │   ├── ListCard.tsx        — Mini card for each list
│   │   │   └── CreateListModal.tsx — Name + icon + color picker
│   │   │
│   │   └── ui/
│   │       ├── ThemeToggle.tsx     — Glass / Minimal + Dark / Light
│   │       ├── Modal.tsx           — Reusable portal modal
│   │       ├── Drawer.tsx          — Slide-in drawer (task form)
│   │       ├── Toast.tsx           — Success/error notifications
│   │       ├── EmptyState.tsx      — Empty list illustration + CTA
│   │       └── Spinner.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLists.ts
│   │   ├── useTasks.ts
│   │   ├── useRealtimeSync.ts
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── database.types.ts      — Generated by Supabase CLI
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx      — All lists overview (bento grid)
│   │   ├── ListPage.tsx           — Tasks in a single list
│   │   ├── SearchPage.tsx         — Full-text search
│   │   └── SettingsPage.tsx       — Theme, profile, sign out
│   │
│   ├── store/
│   │   └── useAppStore.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── .env
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 13. Environment Variables

```bash
# .env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
# .env.example (commit this, not .env)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 14. Deployment

### Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

---

## 15. Definition of Done

Phase 1 is complete when all of the following are true:

- [ ] Can log in via email OTP from any browser
- [ ] Can create, edit, complete, and delete tasks
- [ ] Can create multiple named lists with icons and colors
- [ ] Tasks show priority badge, due date, and tags
- [ ] Subtasks work as a checklist inside a task
- [ ] Drag-and-drop reordering works
- [ ] Changes sync instantly across two open browser tabs
- [ ] Search works across all lists
- [ ] Keyboard shortcuts work (N, /, Cmd+,)
- [ ] Dark/light mode toggle works

**Only after all boxes are checked: start Phase 2.**