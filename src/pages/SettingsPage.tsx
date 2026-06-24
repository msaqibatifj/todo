/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useTaskFlow } from "../store/stateContext";
import { 
  User, 
  Sparkles, 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  LogOut, 
  Sun, 
  Moon, 
  Check, 
  RefreshCw,
  ShieldAlert,
  FileJson
} from "lucide-react";
import type { Theme, ColorMode } from "../types";

export default function SettingsPage() {
  const { 
    profile,
    logout,
    theme, 
    setTheme, 
    colorMode, 
    setColorMode,
    lists,
    tasks,
    resetState
  } = useTaskFlow();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  // Save profile display name to localStorage
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    if (profile) {
      const updatedProfile = { ...profile, display_name: displayName.trim() };
      localStorage.setItem("tf_profile", JSON.stringify(updatedProfile));
      
      // Force reload to sync profile state across context instances or notify user
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        // Force a soft page reload to update sidebar state cleanly
        window.location.reload();
      }, 1000);
    }
  };

  // Export local lists and tasks to a JSON file
  const handleExportData = () => {
    try {
      const backupData = {
        version: "1.0",
        export_date: new Date().toISOString(),
        profile,
        lists,
        tasks
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", "taskflow_workspace_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Backup export failure:", e);
    }
  };

  // Import JSON backup data
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    setImportSuccess(false);
    
    const fileReader = new FileReader();
    const targetFile = e.target.files?.[0];
    if (!targetFile) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.lists && parsed.tasks) {
          localStorage.setItem("tf_lists", JSON.stringify(parsed.lists));
          localStorage.setItem("tf_tasks", JSON.stringify(parsed.tasks));
          setImportSuccess(true);
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setImportError("Invalid backup file. Missing lists or tasks array structure.");
        }
      } catch (err) {
        setImportError("Failed to parse backup file. Please ensure it is a valid JSON workspace file.");
      }
    };
    fileReader.readAsText(targetFile);
  };

  // Clear workspace local database
  const handleResetWorkspace = () => {
    if (confirm("⚠️ WARNING: This will permanently delete all your custom lists, checklist tasks, and preferences. This action cannot be undone. Are you sure you want to proceed?")) {
      localStorage.removeItem("tf_lists");
      localStorage.removeItem("tf_tasks");
      localStorage.removeItem("tf_active_list_id");
      localStorage.removeItem("tf_theme");
      localStorage.removeItem("tf_color_mode");
      alert("Workspace has been fully reset. Reloading default productivity stacks.");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Workspace Preferences</h2>
        <p className="text-xs text-[var(--text-secondary)]">Customize your TaskFlow interface properties, color schemes, profile info, and backups.</p>
      </div>

      {/* Profile settings */}
      {profile && (
        <div className="card-glass p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-indigo-400">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">User Account</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Edit your public metadata profile info</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-glass font-medium text-sm"
                  maxLength={25}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Registered Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="input-glass font-medium text-sm opacity-50 cursor-not-allowed bg-[var(--border)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-5 rounded-xl font-semibold shadow-[var(--accent-glow)]"
              >
                {saveSuccess ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visual styling and presets theme picker */}
      <div className="card-glass p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/10 text-pink-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Visual Experience Theme</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Customize visual system layers and accents</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1 text-xs">
          {/* Aesthetic layout mode */}
          <div className="space-y-2">
            <span className="font-semibold text-[var(--text-secondary)] block">Structure Preset</span>
            <div className="grid grid-cols-2 gap-2 border border-[var(--border)] rounded-xl p-1 bg-opacity-20 bg-[var(--bg-secondary)]">
              {[
                { id: "glass", label: "Glassmorphism", desc: "Frosted panels, deep shadows" },
                { id: "minimal", label: "Flat Minimal", desc: "No blurs, pure clean borders" }
              ].map(preset => {
                const active = theme === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setTheme(preset.id as Theme)}
                    className={`p-3 rounded-lg text-left transition-all ${active ? "bg-[var(--bg-card-hover)] text-[var(--text-primary)] ring-1 ring-indigo-500/30" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]/40"}`}
                  >
                    <span className="block font-bold text-xs">{preset.label}</span>
                    <span className="block text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color lighting mode */}
          <div className="space-y-2">
            <span className="font-semibold text-[var(--text-secondary)] block">Color Mode</span>
            <div className="grid grid-cols-2 gap-2 border border-[var(--border)] rounded-xl p-1 bg-opacity-20 bg-[var(--bg-secondary)]">
              {[
                { id: "dark", label: "Dark mode", icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> },
                { id: "light", label: "Light mode", icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> }
              ].map(mode => {
                const active = colorMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setColorMode(mode.id as ColorMode)}
                    className={`p-3 rounded-lg flex items-center justify-between text-left transition-all ${active ? "bg-[var(--bg-card-hover)] text-[var(--text-primary)] ring-1 ring-indigo-500/30 font-bold" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]/40"}`}
                  >
                    <span>{mode.label}</span>
                    {mode.icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics and imports */}
      <div className="card-glass p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/10 text-amber-400">
            <Settings className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Data Operations & Backups</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Import, export, and manage your local offline workspace data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          {/* Export card */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-opacity-10 bg-[var(--bg-secondary)] flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-indigo-400" />
                <span>Export JSON Backup</span>
              </span>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                Download a fully functional JSON backup containing all lists, task items, subtasks, and logs.
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="btn-ghost py-2 text-xs flex items-center justify-center gap-2 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup</span>
            </button>
          </div>

          {/* Import card */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-opacity-10 bg-[var(--bg-secondary)] flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-pink-400" />
                <span>Restore JSON Workspace</span>
              </span>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                Upload a pre-exported workspace file. This will merge or overwrite current stacks.
              </p>
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
                id="workspace-import-file"
              />
              <label
                htmlFor="workspace-import-file"
                className="btn-ghost py-2 text-xs flex items-center justify-center gap-2 rounded-lg cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose Backup File</span>
              </label>
            </div>
          </div>
        </div>

        {importError && (
          <p className="text-rose-400 text-xs font-semibold">{importError}</p>
        )}
        {importSuccess && (
          <p className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Workspace parsed successfully! Refreshing view...</span>
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card-glass p-6 border-red-500/10 space-y-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Irreversible critical diagnostic tasks</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          <button
            onClick={handleResetWorkspace}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg font-semibold flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Local Workspace</span>
          </button>

          <button
            onClick={() => {
              if (confirm("⚠️ FACTORY RESET: This will delete ALL data including your profile, forcing a fresh login and re-onboarding. Are you sure?")) {
                resetState();
              }
            }}
            className="px-4 py-2 bg-red-700/20 hover:bg-red-700/30 border border-red-600/30 text-red-300 rounded-lg font-semibold flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Factory Reset (Dev)</span>
          </button>
          
          <button
            onClick={logout}
            className="px-4 py-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 text-[var(--text-primary)] rounded-lg font-semibold flex items-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
