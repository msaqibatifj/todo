/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useTaskFlow } from "../store/stateContext";
import { 
  Plus, 
  PlusCircle
} from "lucide-react";
import TaskCard from "../components/TaskCard";
import type { Priority, TaskStatus } from "../types";

export default function ListPage() {
  const { 
    lists, 
    tasks, 
    activeListId, 
    createTask, 
    updateTask, 
    openTaskForm 
  } = useTaskFlow();

  // Inline Quick-Capture Input
  const [quickTitle, setQuickTitle] = useState("");
  
  // Filter state
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("todo");
  const [sortBy, setSortBy] = useState<"manual" | "due" | "priority">("manual");

  // Reset filters when list changes
  useEffect(() => {
    setPriorityFilter("all");
    setStatusFilter("todo");
    setSortBy("manual");
  }, [activeListId]);

  // Find active list info
  const getActiveList = () => {
    if (!activeListId || activeListId === "today") return null;
    return lists.find(l => l.id === activeListId) || null;
  };

  const activeList = getActiveList();

  // Get current list title & details
  const getHeaderDetails = () => {
    if (activeListId === "today") {
      return {
        title: "Today's Agenda",
        icon: "📅",
        desc: "High priority milestones scheduled for today"
      };
    }
    if (activeList) {
      return {
        title: activeList.name,
        icon: activeList.icon,
        desc: `Custom categorized workspace list`
      };
    }
    return {
      title: "All Tasks Stack",
      icon: "📋",
      desc: "Full overview index of your active workflow tasks"
    };
  };

  const header = getHeaderDetails();

  // Filters the tasks array
  const getFilteredTasks = () => {
    let listTasks = [...tasks];

    // 1. Filter by List ID
    if (activeListId === "today") {
      const todayStr = new Date().toISOString().slice(0, 10);
      listTasks = listTasks.filter(t => t.due_date && t.due_date.slice(0, 10) === todayStr);
    } else if (activeListId) {
      listTasks = listTasks.filter(t => t.list_id === activeListId);
    }

    // 2. Filter by status (todo vs done)
    if (statusFilter !== "all") {
      listTasks = listTasks.filter(t => t.status === statusFilter);
    }

    // 3. Filter by priority
    if (priorityFilter !== "all") {
      listTasks = listTasks.filter(t => t.priority === priorityFilter);
    }

    // 4. Sort tasks
    if (sortBy === "due") {
      listTasks.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    } else if (sortBy === "priority") {
      const pLevel = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
      listTasks.sort((a, b) => pLevel[b.priority] - pLevel[a.priority]);
    } else {
      // Manual sorting: maintains array index ordering
      // No extra sort needed because tasks are already returned in general stack order
    }

    return listTasks;
  };

  const filteredTasks = getFilteredTasks();

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    createTask({
      title: quickTitle.trim(),
      list_id: activeListId && activeListId !== "today" ? activeListId : null,
      notes: null,
      due_date: activeListId === "today" ? new Date().toISOString().slice(0, 16) : null,
      priority: "none",
      tags: []
    });

    setQuickTitle("");
  };

  // Move manual task ordering
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredTasks.length) return;

    // Find real IDs of tasks in the master list
    const currentTask = filteredTasks[index];
    const otherTask = filteredTasks[targetIndex];

    // Find indices in master task stack
    const masterIndexA = tasks.findIndex(t => t.id === currentTask.id);
    const masterIndexB = tasks.findIndex(t => t.id === otherTask.id);

    if (masterIndexA !== -1 && masterIndexB !== -1) {
      // Swap sort_order values to reorder tasks
      const originalSortA = currentTask.sort_order;
      const originalSortB = otherTask.sort_order;
      updateTask(currentTask.id, { sort_order: originalSortB });
      updateTask(otherTask.id, { sort_order: originalSortA });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-4 border-[var(--border)] font-sans">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-12 h-12 rounded-none border-2 border-[var(--border)] bg-[#facc15] flex items-center justify-center text-3xl shrink-0 shadow-[2px_2px_0px_0px_var(--border)]"
          >
            {header.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)]">{header.title}</h2>
            <p className="text-xs font-bold text-[var(--text-muted)]">{header.desc}</p>
          </div>
        </div>

        <button
          onClick={() => openTaskForm()}
          className="btn-primary text-xs self-start md:self-auto flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-black font-black" />
          <span>Add Task</span>
        </button>
      </div>

      {/* 2. Quickcapture Input */}
      <form onSubmit={handleQuickSubmit} className="relative font-sans">
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={`⚡ QUICK CAPTURE A TASK... (PRESS ENTER TO CAPTURE)`}
          className="input-glass h-12 text-sm pl-11 pr-4"
        />
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--text-primary)]">
          <PlusCircle className="w-4 h-4 text-black" />
        </span>
      </form>

      {/* 3. Controls Panel: Filters, Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-2 border-[var(--border)] bg-[var(--bg-secondary)] text-xs font-bold shadow-[3px_3px_0px_0px_var(--border)] font-sans uppercase">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)] font-black uppercase tracking-wide">Status:</span>
            <div className="flex gap-1 border-2 border-[var(--border)] bg-[var(--bg-primary)] p-0.5">
              {(["todo", "done", "all"] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2 py-1 transition-colors uppercase cursor-pointer ${statusFilter === status ? "bg-[#facc15] text-black font-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                >
                  {status === "todo" ? "Pending" : status}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)] font-black uppercase tracking-wide">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
              className="bg-[var(--bg-primary)] border-2 border-[var(--border)] px-2 py-1.5 text-[var(--text-secondary)] font-bold focus:outline-none focus:bg-[#facc15] focus:text-black uppercase cursor-pointer"
            >
              <option value="all">ALL PRIORITIES</option>
              <option value="none">P4 - NONE</option>
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
              <option value="urgent">URGENT</option>
            </select>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-muted)] font-black uppercase tracking-wide">Sort:</span>
          <div className="flex gap-1 border-2 border-[var(--border)] bg-[var(--bg-primary)] p-0.5">
            {[
              { id: "manual", label: "Manual" },
              { id: "due", label: "Due Date" },
              { id: "priority", label: "Priority" }
            ].map(sort => (
              <button
                key={sort.id}
                onClick={() => setSortBy(sort.id as any)}
                className={`px-2 py-1 transition-colors uppercase cursor-pointer ${sortBy === sort.id ? "bg-[#facc15] text-black font-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Tasks list view */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3.5">
          {/* Sorting tasks by actual sort_order value first to guarantee consistent manual reordering */}
          {filteredTasks
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                totalTasks={filteredTasks.length}
                onMoveUp={sortBy === "manual" ? () => handleMove(index, "up") : undefined}
                onMoveDown={sortBy === "manual" ? () => handleMove(index, "down") : undefined}
              />
            ))}
        </div>
      ) : (
        <div className="card-glass p-12 text-center space-y-4 max-w-md mx-auto mt-8 font-sans">
          <div className="w-16 h-16 border-2 border-[var(--border)] bg-[#facc15] flex items-center justify-center text-4xl mx-auto shadow-[2px_2px_0px_0px_var(--border)]">
            ⛱️
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase text-[var(--text-primary)]">No tasks found</h3>
            <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed">
              We couldn't locate any tasks matching your active filter criteria. Create a new task or modify filters to expand search.
            </p>
          </div>
          <button
            onClick={() => openTaskForm()}
            className="btn-primary text-xs"
          >
            Create Task Now
          </button>
        </div>
      )}

    </div>
  );
}
