# TaskFlow AI — Phase 2: Mobile App
> **Duration:** 6–8 weeks  
> **Goal:** A real native Android and iOS app connected to the same Supabase backend  
> **Prerequisite:** Phase 1 is deployed and you've used it personally for at least one week  
> **Rule:** The backend does not change. Zero new Supabase tables. Zero new Edge Functions. Only new client.

---

## Table of Contents

1. [What You're Building](#1-what-youre-building)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Setup](#4-project-setup)
5. [Supabase on Mobile](#5-supabase-on-mobile)
6. [Navigation Structure](#6-navigation-structure)
7. [Shared Business Logic](#7-shared-business-logic)
8. [Screen Implementations](#8-screen-implementations)
9. [Push Notifications](#9-push-notifications)
10. [Lock Screen Notifications](#10-lock-screen-notifications)
11. [Offline Support](#11-offline-support)
12. [UI & Styling](#12-ui--styling)
13. [Folder Structure](#13-folder-structure)
14. [Environment Variables](#14-environment-variables)
15. [Building & Publishing](#15-building--publishing)
16. [Definition of Done](#16-definition-of-done)

---

## 1. What You're Building

A React Native mobile app using Expo. Same Supabase backend as Phase 1. Users who log in on web and mobile see identical data in real time.

### Features in Phase 2

- Same auth (email OTP) — works natively on mobile
- All lists and tasks from Phase 1 fully functional
- Real-time sync between web and mobile simultaneously
- Push notifications for due tasks
- Lock screen notifications with action buttons (Complete, Snooze)
- Offline support — read and write tasks without internet, sync on reconnect
- Bottom tab navigation (mobile-native UX)
- Haptic feedback on task completion
- Swipe to complete / swipe to delete tasks
- Android and iOS support

### What is NOT in Phase 2

- AI features (Phase 3)
- QR code device linking (Phase 3)
- Home screen widget (Phase 4 — requires native module)
- Desktop app (Phase 4)
- Neumorphism theme (Phase 4)

---

## 2. Tech Stack

### Mobile Framework

| Technology | Version | Purpose |
|---|---|---|
| **React Native** | 0.74.x | Native Android + iOS from one codebase |
| **Expo** | 51.x | Managed workflow, EAS Build, OTA updates |
| **Expo Router** | 3.x | File-based navigation (same mental model as Next.js) |
| **TypeScript** | 5.x | Type safety |

### Navigation & UI

| Technology | Purpose |
|---|---|
| **Expo Router** | Stack + Tab navigation |
| **React Native Reanimated** | 60fps animations, swipe gestures |
| **React Native Gesture Handler** | Swipe-to-complete, swipe-to-delete |
| **React Native Safe Area Context** | Notch/status bar handling |
| **React Native Screens** | Native screen transitions |
| **@expo/vector-icons** | Icon set (Feather, MaterialIcons) |
| **Expo Haptics** | Haptic feedback on interactions |

### State & Data

| Technology | Purpose |
|---|---|
| **Zustand** | Same store pattern as Phase 1 |
| **TanStack Query** | Same data fetching pattern as Phase 1 |
| **@supabase/supabase-js** | Same Supabase client |
| **AsyncStorage** | React Native equivalent of localStorage |
| **@react-native-async-storage/async-storage** | Zustand persist + Supabase session storage |

### Notifications

| Technology | Purpose |
|---|---|
| **Expo Notifications** | Push notification registration + handling |
| **Expo Background Fetch** | Background due-task checks |
| **Expo Task Manager** | Register background tasks |

### Offline

| Technology | Purpose |
|---|---|
| **@op-engineering/op-sqlite** | SQLite for offline task storage |
| **NetInfo** | Detect online/offline status |

### Build & Distribution

| Technology | Purpose |
|---|---|
| **EAS Build** | Cloud build service (no local Xcode/Android Studio needed) |
| **EAS Submit** | Submit to Play Store / App Store |
| **EAS Update** | Over-the-air JS updates without app store review |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Expo Router (Navigation)            │    │
│  │  Tabs: Home | Lists | Add | Search | Settings   │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────┐    │
│  │           Zustand Store + TanStack Query         │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────┐    │
│  │  Online?  →  Supabase JS Client (direct sync)   │    │
│  │  Offline? →  SQLite local DB (queue writes)     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Background Task → Check due tasks → Local push │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                          │
                          │ (same connection as web)
                          │
              ┌───────────▼───────────┐
              │   SUPABASE (Phase 1)  │
              │   No changes needed   │
              └───────────────────────┘
```

### Key Difference from Web

The web app uses IndexedDB for offline. The mobile app uses SQLite (`op-sqlite`) because IndexedDB doesn't exist in React Native. The sync logic is identical — queue writes when offline, flush when online.

---

## 4. Project Setup

### Initialize Expo Project

```bash
# Create Expo project with TypeScript template
npx create-expo-app@latest taskflow-mobile --template expo-template-blank-typescript
cd taskflow-mobile

# Install Expo Router
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar

# Install all dependencies
npx expo install \
  @supabase/supabase-js \
  @react-native-async-storage/async-storage \
  react-native-url-polyfill \
  @tanstack/react-query \
  zustand \
  react-native-reanimated \
  react-native-gesture-handler \
  expo-haptics \
  expo-notifications \
  expo-background-fetch \
  expo-task-manager \
  @expo/vector-icons \
  expo-secure-store \
  @op-engineering/op-sqlite \
  @react-native-community/netinfo \
  date-fns

# Install dev dependencies
npm install -D @types/react @types/react-native
```

### app.json (Expo Config)

```json
{
  "expo": {
    "name": "TaskFlow AI",
    "slug": "taskflow-ai",
    "version": "1.0.0",
    "scheme": "taskflow",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0a0a14"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.taskflow",
      "infoPlist": {
        "UIBackgroundModes": ["fetch", "remote-notification"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a14"
      },
      "package": "com.yourname.taskflow",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "POST_NOTIFICATIONS"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      [
        "expo-background-fetch",
        { "minimumInterval": 900 }
      ],
      "@op-engineering/op-sqlite"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## 5. Supabase on Mobile

React Native needs URL polyfills and AsyncStorage for session persistence.

```typescript
// src/lib/supabase.ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types"; // copy from Phase 1

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,          // React Native needs this
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false       // No URL detection on mobile
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  }
);
```

### OTP Auth on Mobile

```typescript
// src/hooks/useAuth.ts (mobile version)
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { router } from "expo-router";

export function useAuth() {
  const { setProfile } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else router.replace("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await fetchProfile(session.user.id);
          router.replace("/");
        }
        if (event === "SIGNED_OUT") {
          setProfile(null);
          router.replace("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  }
}

export async function sendOTP(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyOTP(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}
```

---

## 6. Navigation Structure

Expo Router uses a file-based system. Files in `app/` become routes automatically.

```
app/
├── _layout.tsx          — Root layout (fonts, providers)
├── login.tsx            — Login screen
├── (tabs)/
│   ├── _layout.tsx      — Bottom tab bar definition
│   ├── index.tsx        — Home (today's tasks + overdue)
│   ├── lists.tsx        — All named lists
│   ├── add.tsx          — Quick add task (center tab, always visible)
│   ├── search.tsx       — Search screen
│   └── settings.tsx     — Theme, profile, sign out
└── list/
    └── [id].tsx         — Tasks in a specific list
```

### Root Layout

```typescript
// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

SplashScreen.preventAutoHideAsync();

const qc = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Geist-Regular":  require("../assets/fonts/Geist-Regular.ttf"),
    "Geist-Medium":   require("../assets/fonts/Geist-Medium.ttf"),
    "Geist-SemiBold": require("../assets/fonts/Geist-SemiBold.ttf")
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### Bottom Tab Layout

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { useAppStore } from "@/store/useAppStore";

export default function TabLayout() {
  const { openTaskForm } = useAppStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarShowLabel: false
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="lists"
        options={{ tabBarIcon: ({ color }) => <Feather name="list" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarButton: () => (
            <TouchableOpacity style={styles.addButton} onPress={() => openTaskForm()}>
              <Feather name="plus" size={26} color="white" />
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen
        name="search"
        options={{ tabBarIcon: ({ color }) => <Feather name="search" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(15,15,31,0.95)",
    borderTopColor: "rgba(255,255,255,0.07)",
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 10
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8
  }
});
```

---

## 7. Shared Business Logic

The hooks from Phase 1 (`useTasks`, `useLists`, `useRealtimeSync`) work in React Native without changes. Copy them directly. Only the Supabase client initialization differs (AsyncStorage instead of localStorage).

### Zustand Store (Mobile — same as web, add mobile-specific state)

```typescript
// src/store/useAppStore.ts (additions for mobile)
interface AppStore {
  // ... all Phase 1 state ...

  // Mobile-specific
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingOps: OfflineOp[];
  queueOp: (op: OfflineOp) => void;
  clearPendingOps: () => void;
}

// Add to persist config - use AsyncStorage on mobile
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // ... same store implementation ...
      isOnline: true,
      setIsOnline: (isOnline) => set({ isOnline }),
      pendingOps: [],
      queueOp: (op) => set((s) => ({ pendingOps: [...s.pendingOps, op] })),
      clearPendingOps: () => set({ pendingOps: [] })
    }),
    {
      name: "taskflow-store",
      storage: createJSONStorage(() => AsyncStorage) // React Native
    }
  )
);
```

---

## 8. Screen Implementations

### Home Screen — Today's Tasks

```typescript
// app/(tabs)/index.tsx
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTasks } from "@/hooks/useTasks";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useAppStore } from "@/store/useAppStore";
import { TaskCard } from "@/components/tasks/TaskCard";
import { isToday, isPast, parseISO } from "date-fns";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAppStore();
  const { data: tasks = [], isLoading } = useTasks();

  useRealtimeSync(profile!.id);

  const today    = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)) && t.status !== "done");
  const overdue  = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && t.status !== "done");
  const upcoming = tasks.filter(t => !t.due_date && t.status === "todo").slice(0, 5);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.greeting}>
        Good {getTimeOfDay()}, {profile?.display_name?.split(" ")[0]} 👋
      </Text>

      <FlatList
        data={[
          { title: `Overdue (${overdue.length})`, data: overdue, accent: "#ef4444" },
          { title: `Today (${today.length})`,     data: today,   accent: "#6366f1" },
          { title: "No due date",                 data: upcoming, accent: "#737373" }
        ]}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: section }) =>
          section.data.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: section.accent }]}>
                {section.title}
              </Text>
              {section.data.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#0a0a14", paddingHorizontal: 16 },
  greeting:     { fontSize: 22, fontFamily: "Geist-SemiBold", color: "rgba(255,255,255,0.92)", marginBottom: 20 },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontFamily: "Geist-Medium", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }
});
```

### Task Card with Swipe Actions

```typescript
// src/components/tasks/TaskCard.tsx
import { Pressable, View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useCompleteTask, useDeleteTask } from "@/hooks/useTasks";
import { format, parseISO, isPast, isToday } from "date-fns";
import type { Task } from "@/types";

const SWIPE_THRESHOLD = 80;

export function TaskCard({ task }: { task: Task }) {
  const completeTask = useCompleteTask();
  const deleteTask   = useDeleteTask();
  const translateX   = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => { translateX.value = e.translationX; })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // Swipe right → complete
        translateX.value = withTiming(400, { duration: 200 }, () => {
          runOnJS(completeTask.mutate)(task.id);
          runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Swipe left → delete
        translateX.value = withTiming(-400, { duration: 200 }, () => {
          runOnJS(deleteTask.mutate)(task.id);
          runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

  const priorityColors: Record<string, string> = {
    urgent: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e", none: "transparent"
  };

  return (
    <View style={styles.wrapper}>
      {/* Background actions */}
      <View style={styles.actionLeft}>
        <Feather name="check" size={20} color="white" />
        <Text style={styles.actionText}>Complete</Text>
      </View>
      <View style={styles.actionRight}>
        <Feather name="trash-2" size={20} color="white" />
        <Text style={styles.actionText}>Delete</Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, animStyle]}>
          <View style={[styles.priorityBar, { backgroundColor: priorityColors[task.priority] }]} />

          <View style={styles.content}>
            <Text style={[styles.title, task.status === "done" && styles.titleDone]}>
              {task.title}
            </Text>

            {task.due_date && (
              <Text style={[styles.dueDate, isOverdue && styles.dueDateOverdue]}>
                {isOverdue ? "Overdue · " : ""}
                {format(parseISO(task.due_date), "MMM d, h:mm a")}
              </Text>
            )}

            {task.tags.length > 0 && (
              <View style={styles.tags}>
                {task.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:          { marginBottom: 8, borderRadius: 12, overflow: "hidden" },
  card:             { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  priorityBar:      { width: 3, borderRadius: 2 },
  content:          { flex: 1, padding: 14 },
  title:            { fontSize: 15, fontFamily: "Geist-Medium", color: "rgba(255,255,255,0.92)", marginBottom: 4 },
  titleDone:        { textDecorationLine: "line-through", color: "rgba(255,255,255,0.35)" },
  dueDate:          { fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 },
  dueDateOverdue:   { color: "#ef4444" },
  tags:             { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag:              { backgroundColor: "rgba(99,102,241,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  tagText:          { fontSize: 10, color: "#6366f1", fontFamily: "Geist-Medium" },
  actionLeft:       { position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", gap: 4 },
  actionRight:      { position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", gap: 4 },
  actionText:       { color: "white", fontSize: 10, fontFamily: "Geist-Medium" }
});
```

---

## 9. Push Notifications

### Register for Push

```typescript
// src/lib/pushNotifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true
  })
});

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) {
    console.log("Push only works on real device");
    return;
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push permission denied");
    return;
  }

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("tasks", {
      name: "Task Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6366f1"
    });
  }

  // Get Expo push token
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Save to Supabase
  await supabase.from("push_subscriptions").upsert({
    user_id:      userId,
    endpoint:     token,    // Expo token stored in endpoint field
    p256dh:       "expo",   // marker to differentiate from web push
    auth:         "expo",
    device_label: `${Device.osName} ${Device.osVersion}`
  });

  return token;
}
```

### Local Notification Scheduling

```typescript
// src/lib/localNotifications.ts
import * as Notifications from "expo-notifications";
import { parseISO, subMinutes } from "date-fns";
import type { Task } from "@/types";

export async function scheduleTaskReminder(task: Task) {
  if (!task.due_date) return;

  const dueDate      = parseISO(task.due_date);
  const reminderTime = subMinutes(dueDate, 30); // 30 min before

  if (reminderTime < new Date()) return; // already passed

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📋 Task Due Soon",
      body:  task.title,
      data:  { taskId: task.id },
      categoryIdentifier: "task-reminder"
    },
    trigger: { date: reminderTime }
  });
}

export async function cancelTaskReminder(taskId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel  = scheduled.filter(n => n.content.data?.taskId === taskId);
  await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}
```

---

## 10. Lock Screen Notifications

Lock screen behavior comes from system notification configuration. With the setup above, notifications appear on the lock screen on both Android and iOS automatically.

### Notification Action Buttons (Complete / Snooze)

```typescript
// src/lib/notificationCategories.ts
import * as Notifications from "expo-notifications";

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync("task-reminder", [
    {
      identifier: "COMPLETE",
      buttonTitle: "✅ Complete",
      options: { isDestructive: false, isAuthenticationRequired: false }
    },
    {
      identifier: "SNOOZE",
      buttonTitle: "⏰ +1 Hour",
      options: { isDestructive: false, isAuthenticationRequired: false }
    }
  ]);
}

// Handle action button taps in background
// In app/_layout.tsx:
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
) {
  const taskId = response.notification.request.content.data?.taskId;
  if (!taskId) return;

  if (response.actionIdentifier === "COMPLETE") {
    await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", taskId);
  }

  if (response.actionIdentifier === "SNOOZE") {
    const newDue = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from("tasks").update({ due_date: newDue }).eq("id", taskId);
    const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).single();
    if (task) await scheduleTaskReminder(task);
  }
}
```

---

## 11. Offline Support

### SQLite Offline Database

```typescript
// src/lib/offlineDB.ts
import { open } from "@op-engineering/op-sqlite";

const db = open({ name: "taskflow.db" });

// Initialize schema
db.execute(`
  CREATE TABLE IF NOT EXISTS pending_ops (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    op_type     TEXT NOT NULL,
    table_name  TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch())
  );
`);

db.execute(`
  CREATE TABLE IF NOT EXISTS tasks_cache (
    id         TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
`);

export async function queueOperation(
  opType: "insert" | "update" | "delete",
  tableName: string,
  payload: Record<string, unknown>
) {
  db.execute(
    "INSERT INTO pending_ops (op_type, table_name, payload) VALUES (?, ?, ?)",
    [opType, tableName, JSON.stringify(payload)]
  );
}

export async function flushPendingOps(supabase: SupabaseClient) {
  const { rows } = db.execute("SELECT * FROM pending_ops ORDER BY created_at ASC");

  for (const row of rows._array) {
    const payload = JSON.parse(row.payload);
    try {
      if (row.op_type === "insert") await supabase.from(row.table_name).insert(payload);
      if (row.op_type === "update") await supabase.from(row.table_name).update(payload).eq("id", payload.id);
      if (row.op_type === "delete") await supabase.from(row.table_name).delete().eq("id", payload.id);
      db.execute("DELETE FROM pending_ops WHERE id = ?", [row.id]);
    } catch (e) {
      console.error("Failed to flush op:", e);
      break; // stop on first failure, retry on next reconnect
    }
  }
}

export function cacheTask(task: Record<string, unknown>) {
  db.execute(
    "INSERT OR REPLACE INTO tasks_cache (id, data) VALUES (?, ?)",
    [task.id as string, JSON.stringify(task)]
  );
}

export function getCachedTasks(): unknown[] {
  const { rows } = db.execute("SELECT data FROM tasks_cache ORDER BY updated_at DESC");
  return rows._array.map(r => JSON.parse(r.data));
}
```

### Network Monitor

```typescript
// src/hooks/useNetworkMonitor.ts
import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useAppStore } from "@/store/useAppStore";
import { supabase } from "@/lib/supabase";
import { flushPendingOps } from "@/lib/offlineDB";

export function useNetworkMonitor() {
  const { setIsOnline } = useAppStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);

      if (online) {
        // Flush any queued writes when back online
        await flushPendingOps(supabase);
      }
    });

    return () => unsubscribe();
  }, []);
}
```

---

## 12. UI & Styling

React Native uses StyleSheet instead of CSS. No Tailwind in React Native (unless you use NativeWind, which is optional).

### Design Tokens

```typescript
// src/styles/tokens.ts
export const colors = {
  bgPrimary:    "#0a0a14",
  bgSecondary:  "#0f0f1f",
  bgCard:       "rgba(255,255,255,0.04)",
  bgCardHover:  "rgba(255,255,255,0.08)",
  border:       "rgba(255,255,255,0.07)",
  accent:       "#6366f1",
  accentHover:  "#5558e8",
  textPrimary:  "rgba(255,255,255,0.92)",
  textSecondary:"rgba(255,255,255,0.65)",
  textMuted:    "rgba(255,255,255,0.35)",
  priorityLow:    "#22c55e",
  priorityMedium: "#f59e0b",
  priorityHigh:   "#f97316",
  priorityUrgent: "#ef4444"
} as const;

export const typography = {
  fontRegular:  "Geist-Regular",
  fontMedium:   "Geist-Medium",
  fontSemiBold: "Geist-SemiBold",
  xs:   10,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   22,
  xxl:  28
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24
} as const;

export const radius = {
  sm: 8, md: 12, lg: 16, full: 9999
} as const;
```

---

## 13. Folder Structure

```
taskflow-mobile/
├── app/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx         — Home / Today
│   │   ├── lists.tsx         — All lists
│   │   ├── add.tsx           — (invisible, tab button opens modal)
│   │   ├── search.tsx
│   │   └── settings.tsx
│   └── list/
│       └── [id].tsx
│
├── src/
│   ├── components/
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskForm.tsx      — Bottom sheet form
│   │   │   └── SubtaskList.tsx
│   │   ├── lists/
│   │   │   ├── ListCard.tsx
│   │   │   └── CreateListSheet.tsx
│   │   └── ui/
│   │       ├── BottomSheet.tsx
│   │       ├── Badge.tsx
│   │       ├── Spinner.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts           — Mobile version
│   │   ├── useLists.ts          — Same as Phase 1
│   │   ├── useTasks.ts          — Same as Phase 1
│   │   ├── useRealtimeSync.ts   — Same as Phase 1
│   │   └── useNetworkMonitor.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts          — Mobile version (AsyncStorage)
│   │   ├── offlineDB.ts
│   │   ├── pushNotifications.ts
│   │   ├── localNotifications.ts
│   │   ├── notificationCategories.ts
│   │   └── database.types.ts
│   │
│   ├── store/
│   │   └── useAppStore.ts       — Mobile version (AsyncStorage persist)
│   │
│   ├── styles/
│   │   └── tokens.ts
│   │
│   └── types/
│       └── index.ts             — Same as Phase 1
│
├── assets/
│   ├── fonts/
│   │   ├── Geist-Regular.ttf
│   │   ├── Geist-Medium.ttf
│   │   └── Geist-SemiBold.ttf
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── app.json
├── eas.json
├── .env
└── package.json
```

---

## 14. Environment Variables

Expo uses `EXPO_PUBLIC_` prefix for client-side variables.

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

```json
// eas.json (EAS Build config)
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 15. Building & Publishing

### Local Development

```bash
# Start dev server
npx expo start

# Run on Android emulator
npx expo run:android

# Run on iOS simulator (Mac only)
npx expo run:ios
```

### EAS Cloud Build (No local Xcode/Android Studio needed)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build Android APK (for testing)
eas build --platform android --profile preview

# Build production Android AAB (for Play Store)
eas build --platform android --profile production

# Build iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

### Over-the-Air Updates (no app store review needed for JS changes)

```bash
# Push JS update to all installed apps
eas update --branch production --message "Fix task sorting bug"
```

### GitHub Actions for Mobile

```yaml
# .github/workflows/mobile-build.yml
name: EAS Build

on:
  push:
    branches: [main]
    paths: ["taskflow-mobile/**"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install -g eas-cli
      - run: cd taskflow-mobile && npm ci
      - run: cd taskflow-mobile && eas build --platform android --profile preview --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## 16. Definition of Done

Phase 2 is complete when all of the following are true:

- [ ] App builds and runs on a real Android device
- [ ] App builds and runs on iOS (simulator at minimum)
- [ ] Login via email OTP works natively on mobile
- [ ] All tasks and lists from the web app appear on mobile in real time
- [ ] Creating a task on mobile appears instantly on the web app (open in another tab)
- [ ] Swipe right completes a task with haptic feedback
- [ ] Swipe left deletes a task with haptic feedback
- [ ] Push notifications arrive for tasks due within 30 minutes
- [ ] Notification action buttons (Complete, Snooze) work from lock screen
- [ ] App works offline — can view and create tasks — syncs on reconnect
- [ ] APK or TestFlight build distributed to at least one other person for testing

**Only after all boxes are checked: start Phase 3.**