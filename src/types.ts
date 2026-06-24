/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Priority = "none" | "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "done";
export type Theme = "glass" | "minimal";
export type ColorMode = "dark" | "light";
export type HomeView = "dashboard" | "stats" | "list" | "today";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  theme: Theme;
  color_mode: ColorMode;
  created_at: string;
  onboarding_complete: boolean;
  home_view: HomeView;
  home_list_id: string | null;
}

export interface TaskList {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  tags: string[];
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  subtasks: Subtask[];
}
