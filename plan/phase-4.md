# AI Cloud Todo App — Phase 4: Desktop App + Polish

**Duration:** 6–8 weeks  
**Prerequisite:** Phase 3 is complete, AI features are working, and you've been using all three platforms (web, mobile, AI features) daily.  
**Goal:** A complete, shippable product. Tauri desktop app, all three themes, focus mode, export, Android widget, and a GitHub Actions release pipeline.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Desktop Framework | Tauri 2.0 | Rust backend + your existing React frontend. No new UI |
| Desktop Language | Rust | Only needed for tray, shortcuts, system APIs |
| CI/CD | GitHub Actions + `tauri-apps/tauri-action` | Auto-builds .exe / .dmg / .deb on every git tag |
| Android Widget | Expo Modules API + Kotlin | Native — no JS alternative exists |
| Widget Storage | Android SharedPreferences | Bridge between JS and Kotlin widget |
| Theming | CSS Custom Properties | Glass, Neu, Minimal — one variable swap |
| Focus Timer | Browser Notification API + `setInterval` | Pomodoro, no extra library |
| PDF Export | `jsPDF` | Client-side, no server needed |
| CSV Export | `papaparse` | Client-side, no server needed |
| Activity Log | Existing Supabase table + Postgres trigger | Schema already in Phase 1 |
| Analytics | PostHog (optional, self-hosted) | User behavior — opt-in only |

---

## Part 1 — Tauri Desktop App

Tauri wraps your existing React build. There is **no separate UI to write**. The same Vite output that deploys to Vercel also powers the desktop app.

### 4.1 Setup

```bash
cd apps/web

# Install Tauri CLI
npm install --save-dev @tauri-apps/cli@latest

# Initialize Tauri (one-time setup)
npx tauri init
```

When prompted:
- App name: `TaskFlow`
- Window title: `TaskFlow`
- Web assets location: `../dist`
- Dev server URL: `http://localhost:5173`
- Dev command: `pnpm dev`
- Build command: `pnpm build`

### 4.2 `src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "TaskFlow",
  "version": "1.0.0",
  "identifier": "com.yourname.taskflow",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "TaskFlow",
        "width": 1100,
        "height": 720,
        "minWidth": 800,
        "minHeight": 500,
        "decorations": true,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

### 4.3 `src-tauri/Cargo.toml`

```toml
[package]
name = "taskflow"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-global-shortcut = "2"
tauri-plugin-notification = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

### 4.4 `src-tauri/src/main.rs` — System Tray + Global Shortcut

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    Manager, Runtime,
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    image::Image,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // --- System Tray ---
            let show = MenuItem::with_id(app, "show", "Open TaskFlow", true, None::<&str>)?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &separator, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // --- Global Shortcut: Ctrl+Shift+T ---
            let shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::KeyT
            );

            app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, _event| {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            })?;

            // Hide window to tray on close (instead of quitting)
            let window = app.get_webview_window("main").unwrap();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    window.hide().unwrap();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 4.5 Detect Tauri in Frontend

```typescript
// packages/core/utils/platform.ts
export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const isElectron = () =>
  typeof window !== 'undefined' && 'electronAPI' in window

export const isNative = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|Android/.test(navigator.userAgent)
```

Use this to show/hide Tauri-specific UI (like "minimize to tray" toggle in settings).

### 4.6 Local Dev

```bash
cd apps/web
npx tauri dev         # Opens desktop window + hot reload from Vite
```

### 4.7 GitHub Actions — Automated Release Build

On every `git tag` push (e.g. `v1.2.0`), this builds `.exe`, `.dmg`, `.deb`, and `.AppImage` automatically across all three platforms.

```yaml
# .github/workflows/release.yml
name: Release Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write

    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: ubuntu-22.04
            args: ''
          - platform: windows-latest
            args: ''
          - platform: macos-latest
            args: '--target aarch64-apple-darwin'  # Apple Silicon
          - platform: macos-latest
            args: '--target x86_64-apple-darwin'   # Intel Mac

    runs-on: ${{ matrix.platform }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install frontend dependencies
        run: pnpm install

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          projectPath: apps/web
          tagName: ${{ github.ref_name }}
          releaseName: TaskFlow ${{ github.ref_name }}
          releaseBody: |
            Download the installer for your platform below.
            - Windows: `.msi` installer
            - macOS: `.dmg` disk image
            - Linux: `.AppImage` or `.deb`
          releaseDraft: false
          prerelease: false
          args: ${{ matrix.args }}
```

**Trigger a release:**
```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions builds all platforms and creates a GitHub Release automatically
```

---

## Part 2 — Theme System

Three visual languages, one CSS architecture. All components use the same class names — only the CSS variables change.

### 4.8 CSS Variables

```css
/* apps/web/src/styles/themes.css */

/* ─── Glassmorphism (Default) ─────────────────────────────────────── */
:root[data-theme="glass"] {
  --bg-primary:       rgba(15, 15, 35, 0.95);
  --bg-surface:       rgba(255, 255, 255, 0.05);
  --bg-surface-hover: rgba(255, 255, 255, 0.10);
  --bg-overlay:       rgba(0, 0, 0, 0.6);
  --border:           rgba(255, 255, 255, 0.12);
  --border-glow:      rgba(108, 99, 255, 0.4);
  --text-primary:     #F0F0FF;
  --text-secondary:   rgba(240, 240, 255, 0.55);
  --text-muted:       rgba(240, 240, 255, 0.3);
  --accent:           #6C63FF;
  --accent-hover:     #7C73FF;
  --accent-glow:      rgba(108, 99, 255, 0.25);
  --danger:           #FF6B6B;
  --success:          #6BCB77;
  --warning:          #FFD93D;
  --shadow:           0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-sm:        0 2px 8px rgba(0, 0, 0, 0.3);
  --blur:             blur(20px);
  --radius:           16px;
  --radius-sm:        10px;
  --transition:       0.2s ease;
}

/* ─── Neumorphism ─────────────────────────────────────────────────── */
:root[data-theme="neu"] {
  --bg-primary:       #E8EBF0;
  --bg-surface:       #E8EBF0;
  --bg-surface-hover: #DDE0E8;
  --bg-overlay:       rgba(232, 235, 240, 0.9);
  --border:           transparent;
  --border-glow:      transparent;
  --text-primary:     #2D3561;
  --text-secondary:   #6B7280;
  --text-muted:       #9CA3AF;
  --accent:           #5C6BC0;
  --accent-hover:     #4A5ABE;
  --accent-glow:      rgba(92, 107, 192, 0.2);
  --danger:           #E57373;
  --success:          #66BB6A;
  --warning:          #FFA726;
  --shadow:           8px 8px 16px #C5C8D0, -8px -8px 16px #FFFFFF;
  --shadow-sm:        4px 4px 8px #C5C8D0, -4px -4px 8px #FFFFFF;
  --shadow-inset:     inset 4px 4px 8px #C5C8D0, inset -4px -4px 8px #FFFFFF;
  --blur:             none;
  --radius:           20px;
  --radius-sm:        12px;
  --transition:       0.2s ease;
}

/* ─── Minimal ─────────────────────────────────────────────────────── */
:root[data-theme="minimal"] {
  --bg-primary:       #FAFAFA;
  --bg-surface:       #FFFFFF;
  --bg-surface-hover: #F5F5F5;
  --bg-overlay:       rgba(250, 250, 250, 0.95);
  --border:           #E5E7EB;
  --border-glow:      #D1D5DB;
  --text-primary:     #111827;
  --text-secondary:   #6B7280;
  --text-muted:       #9CA3AF;
  --accent:           #111827;
  --accent-hover:     #374151;
  --accent-glow:      rgba(17, 24, 39, 0.08);
  --danger:           #EF4444;
  --success:          #22C55E;
  --warning:          #F59E0B;
  --shadow:           0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm:        0 1px 2px rgba(0, 0, 0, 0.06);
  --blur:             none;
  --radius:           8px;
  --radius-sm:        4px;
  --transition:       0.15s ease;
}

/* ─── Dark mode modifier (applies to all themes) ──────────────────── */
:root[data-mode="dark"][data-theme="minimal"] {
  --bg-primary:       #111827;
  --bg-surface:       #1F2937;
  --bg-surface-hover: #374151;
  --border:           #374151;
  --text-primary:     #F9FAFB;
  --text-secondary:   #9CA3AF;
  --text-muted:       #6B7280;
}

/* ─── Shared component styles (work across all themes) ───────────── */
.surface {
  background: var(--bg-surface);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: background var(--transition), box-shadow var(--transition);
}

.surface:hover {
  background: var(--bg-surface-hover);
}

[data-theme="neu"] .surface:active {
  box-shadow: var(--shadow-inset);
}

.btn-primary {
  background: var(--accent);
  color: #FFFFFF;
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition), box-shadow var(--transition);
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--accent-glow);
}
```

### 4.9 Theme Store (Zustand + Persist)

```typescript
// packages/core/store/theme.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'glass' | 'neu' | 'minimal'
export type ColorMode = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  mode: ColorMode
  setTheme: (t: Theme) => void
  setMode: (m: ColorMode) => void
}

function applyTheme(theme: Theme, mode: ColorMode) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-mode', mode)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'glass',
      mode: 'dark',

      setTheme: (theme) => {
        applyTheme(theme, get().mode)
        set({ theme })
      },

      setMode: (mode) => {
        applyTheme(get().theme, mode)
        set({ mode })
      },
    }),
    {
      name: 'taskflow-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme, state.mode)
      },
    }
  )
)
```

### 4.10 Theme Switcher Component (Web)

```typescript
// apps/web/src/components/ThemeSwitcher.tsx
import { useThemeStore, type Theme, type ColorMode } from '@taskflow/core/store/theme'

const themes: { value: Theme; label: string; preview: string }[] = [
  { value: 'glass', label: 'Glass', preview: 'rgba(255,255,255,0.1)' },
  { value: 'neu', label: 'Neumorphic', preview: '#E8EBF0' },
  { value: 'minimal', label: 'Minimal', preview: '#FFFFFF' },
]

export function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useThemeStore()

  return (
    <div className="theme-switcher">
      <div className="theme-options">
        {themes.map(t => (
          <button
            key={t.value}
            className={`theme-option ${theme === t.value ? 'active' : ''}`}
            onClick={() => setTheme(t.value)}
            style={{ '--preview-color': t.preview } as any}
          >
            <span className="theme-preview" />
            <span className="theme-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mode-toggle">
        <button
          className={mode === 'light' ? 'active' : ''}
          onClick={() => setMode('light')}
        >
          ☀ Light
        </button>
        <button
          className={mode === 'dark' ? 'active' : ''}
          onClick={() => setMode('dark')}
        >
          ● Dark
        </button>
      </div>
    </div>
  )
}
```

---

## Part 3 — Focus Mode (Pomodoro)

```typescript
// apps/web/src/components/FocusMode.tsx
import { useState, useEffect, useCallback } from 'react'
import type { Task } from '@taskflow/core/types'

const WORK_SECONDS = 25 * 60
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60
const LONG_BREAK_AFTER = 4 // sessions before long break

type Phase = 'work' | 'short_break' | 'long_break'

interface Props {
  task: Task
  onClose: () => void
}

export function FocusMode({ task, onClose }: Props) {
  const [seconds, setSeconds] = useState(WORK_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('work')
  const [sessionCount, setSessionCount] = useState(0)

  const getPhaseSeconds = (p: Phase) => {
    if (p === 'work') return WORK_SECONDS
    if (p === 'short_break') return SHORT_BREAK
    return LONG_BREAK
  }

  const advance = useCallback(() => {
    if (phase === 'work') {
      const newCount = sessionCount + 1
      setSessionCount(newCount)
      const nextPhase = newCount % LONG_BREAK_AFTER === 0 ? 'long_break' : 'short_break'
      setPhase(nextPhase)
      setSeconds(getPhaseSeconds(nextPhase))
      notify(nextPhase === 'long_break' ? 'Long break! You earned it.' : 'Take a short break.')
    } else {
      setPhase('work')
      setSeconds(WORK_SECONDS)
      notify('Break over. Back to work.')
    }
    setIsRunning(false)
  }, [phase, sessionCount])

  const notify = (body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TaskFlow', { body, icon: '/icon-192.png' })
    }
  }

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) Notification.requestPermission()
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { advance(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, advance])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const progress = 1 - seconds / getPhaseSeconds(phase)
  const circumference = 2 * Math.PI * 54

  const phaseLabel = {
    work: 'Focus',
    short_break: 'Short Break',
    long_break: 'Long Break',
  }[phase]

  return (
    <div className="focus-overlay">
      <div className="focus-modal surface">
        <button className="focus-close" onClick={onClose}>✕</button>

        <p className="focus-task-title">{task.title}</p>
        <p className="focus-phase">{phaseLabel}</p>

        {/* Circular progress */}
        <svg className="focus-ring" viewBox="0 0 120 120" width={120} height={120}>
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke="var(--accent)" strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        <p className="focus-timer">{mm}:{ss}</p>
        <p className="focus-sessions">{sessionCount} sessions today</p>

        <div className="focus-controls">
          <button
            className="btn-primary"
            onClick={() => setIsRunning(r => !r)}
          >
            {isRunning ? 'Pause' : seconds === getPhaseSeconds(phase) ? 'Start' : 'Resume'}
          </button>
          <button
            className="btn-ghost"
            onClick={() => { setSeconds(getPhaseSeconds(phase)); setIsRunning(false) }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Part 4 — Export (PDF + CSV)

```typescript
// packages/core/export.ts
import jsPDF from 'jspdf'
import Papa from 'papaparse'
import type { Task } from './types'

// ─── CSV Export ───────────────────────────────────────────────────────
export function exportToCsv(tasks: Task[], listName: string): void {
  const rows = tasks.map(t => ({
    Title: t.title,
    Notes: t.notes ?? '',
    Priority: t.priority,
    'Due Date': t.due_date ? new Date(t.due_date).toLocaleDateString() : '',
    Tags: t.tags?.join(', ') ?? '',
    Completed: t.is_completed ? 'Yes' : 'No',
    'Completed At': t.completed_at ? new Date(t.completed_at).toLocaleString() : '',
    'Created At': new Date(t.created_at).toLocaleString(),
  }))

  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${slugify(listName)}-tasks.csv`)
}

// ─── PDF Export ──────────────────────────────────────────────────────
export function exportToPdf(tasks: Task[], listName: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = 20

  const checkPage = (needed: number) => {
    if (y + needed > 275) { doc.addPage(); y = 20 }
  }

  // Header
  doc.setFillColor(108, 99, 255)
  doc.rect(0, 0, pageWidth, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.text('TaskFlow', margin, 8)
  y = 22

  // Title
  doc.setTextColor(30, 30, 60)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(listName, margin, y)
  y += 8

  // Subtitle
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 140)
  const total = tasks.length
  const done = tasks.filter(t => t.is_completed).length
  doc.text(
    `${done}/${total} completed  ·  Exported ${new Date().toLocaleDateString()}`,
    margin, y
  )
  y += 10

  // Divider
  doc.setDrawColor(200, 200, 220)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // Tasks
  tasks.forEach(task => {
    checkPage(18)

    // Priority color bar
    const colors: Record<string, [number, number, number]> = {
      high: [255, 107, 107],
      medium: [255, 217, 61],
      low: [107, 203, 119],
    }
    const [r, g, b] = colors[task.priority] ?? [180, 180, 180]
    doc.setFillColor(r, g, b)
    doc.rect(margin, y - 2, 3, 8, 'F')

    // Checkbox
    doc.setDrawColor(150, 150, 170)
    doc.rect(margin + 6, y - 2, 6, 6)
    if (task.is_completed) {
      doc.setTextColor(r, g, b)
      doc.text('✓', margin + 7.2, y + 2.5)
    }

    // Title
    doc.setTextColor(task.is_completed ? 160 : 30, task.is_completed ? 160 : 30, task.is_completed ? 180 : 60)
    doc.setFontSize(11)
    doc.setFont('helvetica', task.is_completed ? 'normal' : 'bold')
    const titleLines = doc.splitTextToSize(task.title, contentWidth - 20)
    doc.text(titleLines, margin + 16, y + 2.5)
    y += titleLines.length * 5.5 + 2

    // Due date + tags
    if (task.due_date || task.tags?.length) {
      checkPage(7)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(130, 130, 150)
      const meta: string[] = []
      if (task.due_date) meta.push(`Due: ${new Date(task.due_date).toLocaleDateString()}`)
      if (task.tags?.length) meta.push(task.tags.map(t => `#${t}`).join(' '))
      doc.text(meta.join('  ·  '), margin + 16, y)
      y += 6
    }

    // Notes
    if (task.notes) {
      checkPage(7)
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 120)
      const noteLines = doc.splitTextToSize(task.notes, contentWidth - 20)
      doc.text(noteLines, margin + 16, y)
      y += noteLines.length * 4.5 + 2
    }

    y += 4 // Gap between tasks

    // Subtle separator
    doc.setDrawColor(230, 230, 240)
    doc.line(margin + 4, y - 2, pageWidth - margin, y - 2)
  })

  // Page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 180)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 290, { align: 'right' })
  }

  doc.save(`${slugify(listName)}-tasks.pdf`)
}

// ─── Helpers ──────────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
```

**Install dependencies:**
```bash
cd apps/web
npm install jspdf papaparse
npm install -D @types/papaparse
```

---

## Part 5 — Activity Log

### Postgres Trigger (Supabase Migration)

```sql
-- supabase/migrations/20240401000000_activity_log_trigger.sql

CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, entity_id, entity_type, metadata)
    VALUES (
      NEW.user_id,
      'created',
      NEW.id,
      'task',
      jsonb_build_object('title', NEW.title, 'priority', NEW.priority)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_completed AND NOT OLD.is_completed THEN
      INSERT INTO activity_log (user_id, action, entity_id, entity_type, metadata)
      VALUES (
        NEW.user_id,
        'completed',
        NEW.id,
        'task',
        jsonb_build_object('title', NEW.title)
      );
    END IF;

    IF NEW.is_deleted AND NOT OLD.is_deleted THEN
      INSERT INTO activity_log (user_id, action, entity_id, entity_type, metadata)
      VALUES (
        NEW.user_id,
        'deleted',
        NEW.id,
        'task',
        jsonb_build_object('title', NEW.title)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_activity();
```

### Activity Log UI (Web)

```typescript
// apps/web/src/components/ActivityLog.tsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@taskflow/core/supabase'

interface LogEntry {
  id: string
  action: 'created' | 'completed' | 'deleted'
  metadata: { title: string; priority?: string }
  created_at: string
}

const actionConfig = {
  created: { icon: '○', color: 'var(--accent)', label: 'Created' },
  completed: { icon: '✓', color: 'var(--success)', label: 'Completed' },
  deleted: { icon: '✕', color: 'var(--danger)', label: 'Deleted' },
}

export function ActivityLog() {
  const { data: entries = [] } = useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('activity_log')
        .select('id, action, metadata, created_at')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as LogEntry[]
    },
    refetchInterval: 30_000,
  })

  const completed = entries.filter(e => e.action === 'completed').length
  const created = entries.filter(e => e.action === 'created').length

  return (
    <div className="activity-log surface">
      <div className="activity-header">
        <h3>Today's Activity</h3>
        <div className="activity-stats">
          <span><strong>{completed}</strong> completed</span>
          <span><strong>{created}</strong> created</span>
        </div>
      </div>

      <div className="activity-list">
        {entries.length === 0 && (
          <p className="activity-empty">No activity yet today.</p>
        )}
        {entries.map(entry => {
          const config = actionConfig[entry.action]
          const time = new Date(entry.created_at).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
          })
          return (
            <div key={entry.id} className="activity-entry">
              <span className="activity-icon" style={{ color: config.color }}>
                {config.icon}
              </span>
              <div className="activity-content">
                <span className="activity-task">{entry.metadata.title}</span>
                <span className="activity-label">{config.label}</span>
              </div>
              <span className="activity-time">{time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Part 6 — Android Home Screen Widget

**Honest upfront:** This requires writing Kotlin. There is no JavaScript-only way to make an Android home screen widget. This is a native feature.

### 6.1 Create Expo Local Module

```bash
cd apps/mobile
npx create-expo-module task-widget --local
```

This creates `modules/task-widget/` inside your mobile app.

### 6.2 Widget Layout (`res/layout/widget_task.xml`)

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#CC0F0F23"
    android:padding="16dp"
    android:orientation="vertical"
    android:gravity="center_vertical">

    <TextView
        android:id="@+id/widget_app_name"
        android:text="TaskFlow"
        android:textColor="#996C63FF"
        android:textSize="11sp"
        android:letterSpacing="0.1"
        android:textAllCaps="true"
        android:layout_marginBottom="8dp" />

    <TextView
        android:id="@+id/widget_task_count"
        android:textColor="#99F0F0FF"
        android:textSize="11sp"
        android:layout_marginBottom="4dp" />

    <TextView
        android:id="@+id/widget_task_title_1"
        android:textColor="#F0F0FF"
        android:textSize="14sp"
        android:fontFamily="sans-serif-medium"
        android:maxLines="1"
        android:ellipsize="end"
        android:layout_marginBottom="4dp" />

    <TextView
        android:id="@+id/widget_task_title_2"
        android:textColor="#CCF0F0FF"
        android:textSize="13sp"
        android:maxLines="1"
        android:ellipsize="end"
        android:layout_marginBottom="4dp" />

    <TextView
        android:id="@+id/widget_task_title_3"
        android:textColor="#99F0F0FF"
        android:textSize="13sp"
        android:maxLines="1"
        android:ellipsize="end" />

</LinearLayout>
```

### 6.3 Widget Manifest Entry (`AndroidManifest.xml`)

```xml
<receiver
    android:name=".widget.TaskWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info" />
</receiver>
```

### `res/xml/widget_info.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:previewImage="@drawable/widget_preview"
    android:initialLayout="@layout/widget_task"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```

### 6.4 Kotlin Widget Provider

```kotlin
// modules/task-widget/android/src/main/java/TaskWidgetProvider.kt
package com.yourname.taskflow.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.yourname.taskflow.R
import org.json.JSONArray

class TaskWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences("TaskflowWidget", Context.MODE_PRIVATE)
            val taskJson = prefs.getString("upcoming_tasks", "[]") ?: "[]"

            val views = RemoteViews(context.packageName, R.layout.widget_task)

            try {
                val tasks = JSONArray(taskJson)
                val count = tasks.length()

                views.setTextViewText(
                    R.id.widget_task_count,
                    "$count task${if (count == 1) "" else "s"} upcoming"
                )

                val titleIds = listOf(
                    R.id.widget_task_title_1,
                    R.id.widget_task_title_2,
                    R.id.widget_task_title_3
                )

                titleIds.forEachIndexed { i, viewId ->
                    if (i < count) {
                        val task = tasks.getJSONObject(i)
                        views.setTextViewText(viewId, task.getString("title"))
                        views.setViewVisibility(viewId, android.view.View.VISIBLE)
                    } else {
                        views.setViewVisibility(viewId, android.view.View.GONE)
                    }
                }

            } catch (e: Exception) {
                views.setTextViewText(R.id.widget_task_count, "Open app to sync")
            }

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
```

### 6.5 Expo Module Bridge (JS → Kotlin)

```kotlin
// modules/task-widget/android/src/main/java/TaskWidgetModule.kt
package expo.modules.taskwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.yourname.taskflow.widget.TaskWidgetProvider

class TaskWidgetModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("TaskWidget")

        Function("updateWidgetData") { tasksJson: String ->
            val context = appContext.reactContext ?: return@Function

            // Save to SharedPreferences so widget can read it
            val prefs = context.getSharedPreferences("TaskflowWidget", Context.MODE_PRIVATE)
            prefs.edit().putString("upcoming_tasks", tasksJson).apply()

            // Trigger widget redraw
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, TaskWidgetProvider::class.java)
            )
            TaskWidgetProvider().onUpdate(context, manager, ids)
        }
    }
}
```

### 6.6 Call from JavaScript

```typescript
// apps/mobile/lib/widgetSync.ts
import { NativeModules } from 'react-native'
import type { Task } from '@taskflow/core/types'

export function syncTasksToWidget(tasks: Task[]): void {
  if (!NativeModules.TaskWidget) return // Not on Android or module not loaded

  const upcoming = tasks
    .filter(t => !t.is_completed && !t.is_deleted)
    .sort((a, b) => {
      // Prioritize tasks with due dates, then by priority
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      if (a.due_date) return -1
      if (b.due_date) return 1
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    .slice(0, 5)
    .map(t => ({ id: t.id, title: t.title, due_date: t.due_date, priority: t.priority }))

  NativeModules.TaskWidget.updateWidgetData(JSON.stringify(upcoming))
}
```

**Call it whenever tasks change:**
```typescript
// apps/mobile/app/(tabs)/index.tsx — inside your task list
const { data: tasks } = useTaskList(listId)

useEffect(() => {
  if (tasks) syncTasksToWidget(tasks)
}, [tasks])
```

---

## Part 7 — Tauri Local Build Commands

```bash
# Development (desktop window with hot reload)
cd apps/web && npx tauri dev

# Production build (current platform only)
npx tauri build

# Output locations:
# Windows:  src-tauri/target/release/bundle/msi/TaskFlow_1.0.0_x64_en-US.msi
# macOS:    src-tauri/target/release/bundle/dmg/TaskFlow_1.0.0_x64.dmg
# Linux:    src-tauri/target/release/bundle/deb/task-flow_1.0.0_amd64.deb
#           src-tauri/target/release/bundle/appimage/task-flow_1.0.0_amd64.AppImage

# Generate a release (triggers GitHub Actions)
git tag v1.0.0 && git push origin v1.0.0
```

---

## Phase 4 Checklist

### Desktop (Tauri)
- [ ] Tauri 2.0 initialized in `apps/web`
- [ ] `tauri dev` opens desktop window locally
- [ ] System tray icon appears on all platforms
- [ ] Left-click tray icon: show/hide window
- [ ] Tray menu: Open TaskFlow, Quit
- [ ] Global shortcut `Ctrl+Shift+T` toggles window
- [ ] Window close hides to tray (doesn't quit)
- [ ] GitHub Actions release workflow created
- [ ] Test: push a git tag, verify GitHub Release is created with all 3 platform builds

### Theming
- [ ] Glassmorphism CSS variables implemented
- [ ] Neumorphism CSS variables implemented
- [ ] Minimal CSS variables implemented
- [ ] Dark / Light mode modifier working
- [ ] Theme switcher persists selection (Zustand + localStorage)
- [ ] All components use `var(--*)` — no hardcoded colors in components
- [ ] Theme applies on page load (no flash of wrong theme)

### Focus Mode
- [ ] Pomodoro timer renders with circular progress ring
- [ ] Start / Pause / Reset controls work
- [ ] Phase advances automatically: work → break → work
- [ ] Long break after every 4 sessions
- [ ] Browser notification fires at end of each phase
- [ ] Session count displayed

### Export
- [ ] `jsPDF` and `papaparse` installed
- [ ] CSV export downloads correctly with all fields
- [ ] PDF export has priority color bar, checkbox, metadata row
- [ ] PDF page numbers in footer
- [ ] Export accessible from list context menu and settings

### Activity Log
- [ ] Postgres trigger deployed via Supabase migration
- [ ] `created`, `completed`, `deleted` events logged
- [ ] Activity log UI shows today's entries
- [ ] Real-time update every 30 seconds
- [ ] Stats: tasks created / completed count shown

### Android Widget
- [ ] Expo local module scaffold created
- [ ] Kotlin widget provider compiles without errors
- [ ] Widget appears in Android widget picker
- [ ] `syncTasksToWidget()` called on task list update
- [ ] Widget shows up to 3 upcoming tasks
- [ ] Widget updates when tasks change

### Stretch Goals
- [ ] Play Store submission via EAS Submit
- [ ] App Store submission (requires Apple Developer account)
- [ ] Windows 11 Widget API integration
- [ ] PostHog analytics (opt-in, self-hosted)