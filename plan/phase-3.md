# AI Cloud Todo App — Phase 3: AI Features

**Duration:** 4–6 weeks  
**Prerequisite:** Phase 2 mobile app is running on your phone and you've used it for at least one week.  
**Goal:** Natural language input, smart task parsing, QR device linking, and AI-powered suggestions.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| AI Model | Anthropic Claude (`claude-sonnet-4-6`) | Task parsing, NL input, suggestions |
| AI SDK | `@anthropic-ai/sdk` | Official SDK — used server-side only |
| Edge Runtime | Supabase Edge Functions (Deno) | API key never touches the client |
| Schema Validation | Zod | Type-safe structured AI output |
| QR Generation | `qrcode` (npm) | Web side — generates scannable QR |
| QR Scanning | `expo-camera` + barcode scanner | Mobile side — reads QR |
| Local AI (Optional) | Ollama + `llama3.2` | Privacy toggle — requires local server |

---

## Architecture — AI Call Flow

```
Client (web or mobile)
        │
        │  calls supabase.functions.invoke(...)
        ▼
Supabase Edge Function      ← Anthropic API key lives HERE only, never client
        │
        ├─► Claude API (claude-sonnet-4-6)
        │           │
        │           ▼
        │     Structured JSON response
        │           │
        │     Zod validation
        │           │
        ▼           ▼
  Return to client  OR  Insert directly to DB
        │
        ▼
  Supabase Realtime broadcast
        │
        ▼
  All devices update instantly
```

**Non-negotiable rule:** The `ANTHROPIC_API_KEY` is set as a Supabase secret, called only from Edge Functions. Never in `EXPO_PUBLIC_*` variables or any frontend code.

```bash
# Set secret in Supabase (one-time setup)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Edge Function 1 — Bulk Task Parser

Takes a block of text (meeting notes, email, list) and extracts multiple tasks with metadata.

```typescript
// supabase/functions/ai-parse-tasks/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { z } from 'npm:zod'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const TaskSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1).max(200),
    notes: z.string().optional(),
    due_date: z.string().nullable(), // ISO 8601 or null
    priority: z.enum(['low', 'medium', 'high']),
    tags: z.array(z.string()),
  }))
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, timezone } = await req.json()

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a task extraction engine. Extract actionable tasks from text.
Today is ${today}. User timezone: ${timezone ?? 'UTC'}.

For each task:
- title: concise action phrase (verb + object), max 200 chars
- notes: extra context or details, omit if none
- due_date: ISO 8601 string if date/time mentioned, null otherwise. Resolve relative dates like "tomorrow", "next Monday".
- priority: infer from urgency words (ASAP/urgent/critical = high, soon/this week = medium, otherwise low)
- tags: relevant keywords (max 5)

Return ONLY valid JSON. No markdown, no explanation. Schema: { "tasks": [...] }`,
      messages: [{
        role: 'user',
        content: text
      }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = TaskSchema.parse(JSON.parse(raw))

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Parse failed', detail: message }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Edge Function 2 — Natural Language Single Task

Converts a single natural language phrase into a structured task. Used for the quick-add bar.

```typescript
// supabase/functions/ai-nl-task/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { z } from 'npm:zod'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const SingleTaskSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().optional(),
  due_date: z.string().nullable(),
  priority: z.enum(['low', 'medium', 'high']),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { input, timezone } = await req.json()
  const now = new Date().toISOString()

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: `You convert natural language into a single structured task.
Current datetime: ${now}. Timezone: ${timezone ?? 'UTC'}.
Return ONLY valid JSON: { "title", "notes"?, "due_date": ISO8601|null, "priority": "low"|"medium"|"high" }
No markdown. No explanation.`,
      messages: [{ role: 'user', content: input }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const parsed = SingleTaskSchema.parse(JSON.parse(raw))

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    // Fallback: treat the whole input as the title
    return new Response(
      JSON.stringify({ title: input, due_date: null, priority: 'medium' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Edge Function 3 — Smart Suggestions

Analyzes the user's task patterns and returns 2–3 short, actionable suggestions.

```typescript
// supabase/functions/ai-suggestions/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'
import { z } from 'npm:zod'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const SuggestionsSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(3)
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Validate caller is authenticated
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Fetch user's recent tasks directly in the Edge Function
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, is_completed, due_date, priority, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const now = new Date()
  const overdue = (tasks ?? []).filter(t =>
    t.due_date && new Date(t.due_date) < now && !t.is_completed
  )
  const completedRecently = (tasks ?? [])
    .filter(t => t.is_completed)
    .slice(0, 15)
  const highPriorityPending = (tasks ?? [])
    .filter(t => !t.is_completed && t.priority === 'high')

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: `You are a productivity coach. Give 2-3 specific, short, actionable suggestions based on task patterns.
Be direct. No fluff. Each suggestion under 80 characters.
Return ONLY JSON: { "suggestions": ["...", "...", "..."] }`,
      messages: [{
        role: 'user',
        content: `Overdue tasks (${overdue.length}): ${JSON.stringify(overdue.slice(0, 5).map(t => t.title))}
High priority pending (${highPriorityPending.length}): ${JSON.stringify(highPriorityPending.slice(0, 5).map(t => t.title))}
Recently completed: ${JSON.stringify(completedRecently.map(t => t.title))}`
      }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{"suggestions":[]}'
    const parsed = SuggestionsSchema.parse(JSON.parse(raw))

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch {
    return new Response(
      JSON.stringify({ suggestions: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Deploy Edge Functions

```bash
# Deploy all three
supabase functions deploy ai-parse-tasks
supabase functions deploy ai-nl-task
supabase functions deploy ai-suggestions

# Verify secrets are set
supabase secrets list
```

---

## Frontend — AI Bulk Import (Web)

```typescript
// apps/web/src/components/AiImport.tsx
import { useState } from 'react'
import { supabase } from '@taskflow/core/supabase'
import type { Task } from '@taskflow/core/types'

interface ParsedTask {
  title: string
  notes?: string
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  tags: string[]
}

interface Props {
  listId: string
  onImported: () => void
}

export function AiImport({ listId, onImported }: Props) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ParsedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const parse = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase.functions.invoke('ai-parse-tasks', {
      body: {
        text,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    })

    if (error) setError('Failed to parse. Try again.')
    else setPreview(data.tasks)
    setLoading(false)
  }

  const importAll = async () => {
    const inserts = preview.map((task, i) => ({
      ...task,
      list_id: listId,
      position: Date.now() + i,
    }))

    const { error } = await supabase.from('tasks').insert(inserts)
    if (!error) {
      setPreview([])
      setText('')
      onImported()
    }
  }

  const removeFromPreview = (index: number) => {
    setPreview(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="ai-import">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Paste anything — meeting notes, email, bullet list.
AI will extract tasks automatically.

Example:
"Need to submit report by Friday. Also, schedule dentist appointment 
for next week. Review John's PR today — it's urgent."`}
        rows={8}
      />

      {error && <p className="error">{error}</p>}

      <button
        onClick={parse}
        disabled={loading || !text.trim()}
        className="btn-primary"
      >
        {loading ? 'Parsing with AI...' : 'Extract Tasks'}
      </button>

      {preview.length > 0 && (
        <div className="preview-panel">
          <div className="preview-header">
            <h4>{preview.length} tasks found</h4>
            <button onClick={() => setPreview([])}>Clear</button>
          </div>

          <div className="preview-list">
            {preview.map((task, i) => (
              <div key={i} className="preview-task">
                <span className={`priority-dot priority-${task.priority}`} />
                <div className="preview-task-content">
                  <span className="preview-task-title">{task.title}</span>
                  {task.due_date && (
                    <span className="preview-task-due">
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {task.tags.length > 0 && (
                    <div className="preview-tags">
                      {task.tags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="remove-task"
                  onClick={() => removeFromPreview(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button onClick={importAll} className="btn-primary">
            Import {preview.length} Tasks
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## Natural Language Task Bar (Mobile)

```typescript
// apps/mobile/components/NlTaskBar.tsx
import { useState, useRef } from 'react'
import {
  View, TextInput, TouchableOpacity, Text,
  ActivityIndicator, StyleSheet, Animated
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { supabase } from '@taskflow/core/supabase'
import { offlineQueue } from '@taskflow/core/offline-queue'
import { taskApi } from '@taskflow/core/api/tasks'

interface Props {
  listId: string
}

export function NlTaskBar({ listId }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const submit = async () => {
    const text = input.trim()
    if (!text) return

    setInput('')
    setLoading(true)

    try {
      // Try AI parse
      const { data, error } = await supabase.functions.invoke('ai-nl-task', {
        body: {
          input: text,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })

      const taskData = error
        ? { title: text, due_date: null, priority: 'medium' as const }
        : data

      await taskApi.create({ ...taskData, list_id: listId })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      // Offline — queue it
      offlineQueue.enqueue('create_task', {
        title: text,
        list_id: listId,
        priority: 'medium',
        due_date: null,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={input}
        onChangeText={setInput}
        placeholder='Add task... or "submit report tomorrow at 3pm"'
        placeholderTextColor="rgba(240,240,255,0.3)"
        style={styles.input}
        onSubmitEditing={submit}
        returnKeyType="done"
        blurOnSubmit={false}
      />
      {loading ? (
        <ActivityIndicator color="#6C63FF" style={styles.send} />
      ) : (
        <TouchableOpacity onPress={submit} style={styles.send} disabled={!input.trim()}>
          <Text style={[styles.sendText, !input.trim() && styles.sendDisabled]}>↑</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    color: '#F0F0FF',
    fontSize: 15,
    paddingVertical: 12,
  },
  send: {
    padding: 8,
  },
  sendText: {
    color: '#6C63FF',
    fontSize: 20,
    fontWeight: '700',
  },
  sendDisabled: { color: 'rgba(108,99,255,0.3)' },
})
```

---

## Smart Suggestions Card (Web)

```typescript
// apps/web/src/components/AiSuggestions.tsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@taskflow/core/supabase'

export function AiSuggestions() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-suggestions')
      if (error) throw error
      return data as { suggestions: string[] }
    },
    staleTime: 10 * 60 * 1000, // Refresh every 10 minutes
    retry: 1,
  })

  if (isLoading) return <div className="suggestions-card loading">Getting suggestions...</div>
  if (!data?.suggestions?.length) return null

  return (
    <div className="suggestions-card">
      <div className="suggestions-header">
        <span className="suggestions-icon">✦</span>
        <span>AI Suggestions</span>
      </div>
      <ul className="suggestions-list">
        {data.suggestions.map((s, i) => (
          <li key={i} className="suggestion">{s}</li>
        ))}
      </ul>
    </div>
  )
}
```

---

## QR Code Device Linking

When a user is logged in on mobile and wants to log into the web app (PC) without typing — or vice versa.

### Database

```sql
-- Add to your Supabase migrations
CREATE TABLE qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only the authenticated user can read/write their own sessions
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own QR sessions"
  ON qr_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-delete expired sessions nightly
CREATE OR REPLACE FUNCTION delete_expired_qr_sessions()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM qr_sessions WHERE expires_at < NOW();
$$;
```

### PC Side — Generate and Display QR

```typescript
// apps/web/src/components/QrDeviceLink.tsx
import QRCode from 'qrcode'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@taskflow/core/supabase'

type Status = 'generating' | 'waiting' | 'claimed' | 'expired' | 'error'

export function QrDeviceLink() {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>('generating')

  const generate = useCallback(async () => {
    setStatus('generating')

    const { data, error } = await supabase
      .from('qr_sessions')
      .insert({})
      .select('code')
      .single()

    if (error || !data) { setStatus('error'); return }

    setCode(data.code)
    const url = await QRCode.toDataURL(`taskflow://qr/${data.code}`, {
      width: 200,
      margin: 2,
      color: { dark: '#6C63FF', light: '#0F0F23' }
    })
    setQrDataUrl(url)
    setStatus('waiting')
  }, [])

  useEffect(() => { generate() }, [generate])

  // Poll for claim
  useEffect(() => {
    if (!code || status !== 'waiting') return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('qr_sessions')
        .select('claimed_at, expires_at')
        .eq('code', code)
        .single()

      if (!data) return
      if (new Date(data.expires_at) < new Date()) {
        setStatus('expired')
        clearInterval(interval)
      }
      if (data.claimed_at) {
        setStatus('claimed')
        clearInterval(interval)
      }
    }, 2000)

    // Auto-expire in UI after 5 minutes
    const timeout = setTimeout(() => {
      setStatus('expired')
      clearInterval(interval)
    }, 5 * 60 * 1000)

    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [code, status])

  return (
    <div className="qr-panel">
      <h3>Link a Device</h3>
      <p>Scan this QR code with your phone to log in instantly.</p>

      {status === 'generating' && <div className="qr-placeholder">Generating...</div>}
      {(status === 'waiting') && <img src={qrDataUrl} alt="Scan to link device" width={200} />}
      {status === 'claimed' && (
        <div className="qr-success">
          <span>✓ Device linked successfully!</span>
        </div>
      )}
      {status === 'expired' && (
        <div className="qr-expired">
          <p>QR code expired.</p>
          <button onClick={generate}>Generate New Code</button>
        </div>
      )}
      {status === 'error' && (
        <div className="qr-error">
          <p>Failed to generate QR code.</p>
          <button onClick={generate}>Try Again</button>
        </div>
      )}
    </div>
  )
}
```

### Mobile Side — Scan and Claim

```typescript
// apps/mobile/app/qr-scan.tsx
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { supabase } from '@taskflow/core/supabase'
import { router } from 'expo-router'

export default function QrScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || claiming) return
    setScanned(true)
    setClaiming(true)

    // Extract code from deep link
    const code = data.startsWith('taskflow://qr/')
      ? data.replace('taskflow://qr/', '')
      : data

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('Error', 'You must be logged in to link a device.')
      setScanned(false)
      setClaiming(false)
      return
    }

    const { error } = await supabase
      .from('qr_sessions')
      .update({
        user_id: user.id,
        claimed_at: new Date().toISOString()
      })
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .is('claimed_at', null) // Prevent double-claim

    setClaiming(false)

    if (error) {
      Alert.alert('Failed', 'QR code is invalid or expired. Please try again.')
      setScanned(false)
    } else {
      Alert.alert('Success', 'Device linked!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    }
  }

  if (!permission) return <View />

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is needed to scan QR codes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan QR Code</Text>
      <Text style={styles.subtitle}>Point your camera at the code shown on your PC.</Text>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleScan}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={styles.overlay} />
      </View>

      {claiming && <Text style={styles.claiming}>Linking device...</Text>}

      {scanned && !claiming && (
        <TouchableOpacity style={styles.button} onPress={() => setScanned(false)}>
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F23', padding: 24 },
  title: { color: '#F0F0FF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: 'rgba(240,240,255,0.6)', textAlign: 'center', marginBottom: 32 },
  text: { color: '#F0F0FF', textAlign: 'center', marginBottom: 24 },
  cameraContainer: { width: 260, height: 260, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2, borderColor: '#6C63FF', borderRadius: 16,
  },
  claiming: { color: '#6C63FF', marginTop: 24, fontSize: 16 },
  button: { backgroundColor: '#6C63FF', borderRadius: 12, padding: 16, marginTop: 24 },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
})
```

---

## Optional: Local AI Toggle (Ollama)

Add this only if you want a privacy mode. Requires user to install Ollama separately — document this clearly in the app.

```typescript
// packages/core/ai-config.ts
export type AiProvider = 'claude' | 'ollama'

// In settings store — persisted
export const aiConfig = {
  provider: 'claude' as AiProvider,
  ollamaEndpoint: 'http://localhost:11434', // User's local machine
  ollamaModel: 'llama3.2',
}
```

```typescript
// supabase/functions/ai-nl-task/index.ts — updated with provider switch
const provider = req.headers.get('X-Ai-Provider') ?? 'claude'

let result: string
if (provider === 'ollama') {
  const ollamaEndpoint = req.headers.get('X-Ollama-Endpoint') ?? 'http://localhost:11434'
  const res = await fetch(`${ollamaEndpoint}/api/generate`, {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: `Parse task: ${input}. Return JSON: {title, due_date, priority}`,
      stream: false,
    })
  })
  const data = await res.json()
  result = data.response
} else {
  // Claude (default)
  const message = await client.messages.create({ /* ... */ })
  result = message.content[0].type === 'text' ? message.content[0].text : '{}'
}
```

**Honest note:** Ollama mode means the request leaves the Edge Function and hits the user's local machine. This is architecturally awkward — the Edge Function in Supabase is calling back to the user's localhost, which only works if the user runs a local proxy. Simpler approach: have the Ollama call happen directly from the frontend (acceptable since no API key is involved). Flag this clearly in your code.

---

## Phase 3 Checklist

- [ ] `ANTHROPIC_API_KEY` secret set via `supabase secrets set`
- [ ] `ai-parse-tasks` Edge Function deployed and tested
- [ ] `ai-nl-task` Edge Function deployed and tested
- [ ] `ai-suggestions` Edge Function deployed and tested
- [ ] AI bulk import panel on web (text → preview → import)
- [ ] NL task bar on mobile (type → AI parses → task created)
- [ ] Smart suggestions card on web dashboard
- [ ] Suggestions refresh every 10 minutes (TanStack Query staleTime)
- [ ] `qr_sessions` table created with RLS policy
- [ ] QR generator on web (PC) with polling for claim
- [ ] QR scanner on mobile with `expo-camera`
- [ ] Session claim + link flow tested end-to-end
- [ ] QR code expires after 5 minutes (enforced in DB + UI)
- [ ] Error handling: expired QR, already-claimed, offline fallback
- [ ] (Optional) Ollama local AI toggle documented and implemented
- [ ] Use all AI features daily for 1 week before starting Phase 4  