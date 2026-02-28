# Rocketship 🚀

**Generate live iOS React Native apps from a text description — powered by a multi-agent Mistral AI pipeline.**

Rocketship turns a plain-English app idea into a fully running React Native app in under a minute. Type what you want, answer a few clarifying questions, and watch five AI agents plan, write, validate, fix, and deploy your app to an interactive Expo preview.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Multi-Agent Pipeline](#multi-agent-pipeline)
- [Conversational Clarification](#conversational-clarification)
- [API Routes](#api-routes)
- [Code Validation & Auto-Fix System](#code-validation--auto-fix-system)
- [Project Persistence](#project-persistence)
- [Frontend Architecture](#frontend-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## How It Works

```
User types prompt
       │
       ▼
 ClarifyAgent asks 3 questions (Mistral Small)
       │
  User answers conversationally
       │
       ▼
 ┌─────────────────────────────────────┐
 │        Multi-Agent Pipeline         │
 │                                     │
 │  1. PlannerAgent  (Mistral Small)   │
 │  2. CoderAgent    (Codestral)       │
 │  3. ValidatorAgent (deterministic)  │
 │  4. FixerAgent    (Codestral)       │
 │  5. DeployerAgent (Expo Snack API)  │
 └─────────────────────────────────────┘
       │
       ▼
 Live app running in Expo Snack iframe
```

Every agent step is streamed back to the browser in real time via **Server-Sent Events (SSE)**, updating a live pipeline card in the chat UI as each agent completes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript / JavaScript |
| AI Models | Mistral Small, Codestral (via Mistral API) |
| Streaming | Server-Sent Events (SSE) via `ReadableStream` |
| Preview | Expo Snack Embed API |
| QR Codes | `qrcode` npm package |
| Syntax highlighting | `react-syntax-highlighter` |
| Styling | Inline styles + Tailwind CSS |
| Persistence | JSON files on disk (`data/projects/`) |
| Runtime | Node.js (Next.js server) |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                           │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────────────┐  │
│  │   Chat Panel     │      │    Preview / Code Panel  │  │
│  │                  │      │                          │  │
│  │  • User messages │      │  • Expo Snack iframe     │  │
│  │  • Q&A bubbles   │      │  • Syntax-highlighted    │  │
│  │  • Pipeline card │      │    multi-file code view  │  │
│  │    (live steps)  │      │  • Loading animation     │  │
│  └────────┬─────────┘      └──────────────────────────┘  │
└───────────┼──────────────────────────────────────────────┘
            │ fetch (SSE stream)
            ▼
┌──────────────────────────────────────────────────────────┐
│                   Next.js App Router                     │
│                                                          │
│  POST /api/clarify   →  Mistral Small (questions)        │
│  POST /api/build     →  SSE orchestrator (5 agents)      │
│    ├── Mistral Small  (PlannerAgent)                     │
│    ├── Codestral      (CoderAgent)                       │
│    ├── utils.js       (ValidatorAgent — no LLM)          │
│    ├── Codestral      (FixerAgent — conditional)         │
│    └── Expo Snack API (DeployerAgent)                    │
│                                                          │
│  POST /api/project   →  Persist files to disk            │
│  GET  /api/project   →  Restore project from disk        │
└──────────────────────────────────────────────────────────┘
```

---

## Multi-Agent Pipeline

The core of Rocketship is a **5-agent sequential pipeline** running inside a single streaming HTTP endpoint (`/api/build`). Each agent has a distinct role and model selection optimised for that role.

### Agent 1 — PlannerAgent
**Model:** `mistral-small-latest`
**Role:** Architect

Takes the user's (enriched) prompt and produces a structured JSON blueprint defining every screen, navigation graph, shared state, dummy data shape, and estimated complexity. Uses `mistral-small` rather than a larger model because the task is structured and well-constrained — faster and cheaper.

```json
{
  "appName": "FitTrack",
  "screens": [
    {
      "name": "HomeScreen",
      "purpose": "Dashboard showing daily step count and goals",
      "components": ["FlatList", "TouchableOpacity"],
      "navigation": { "to": ["StatsScreen", "HistoryScreen"], "back": null },
      "state": ["steps: number", "goal: number"],
      "dataShape": { "date": "string", "steps": "number" }
    }
  ],
  "complexity": "medium",
  "estimatedLines": 320
}
```

The blueprint is streamed to the UI immediately so the user sees the app plan while the coder is still running.

---

### Agent 2 — CoderAgent
**Model:** `codestral-latest`
**Role:** Engineer

Receives the blueprint and writes a complete, self-contained `App.js` targeting Expo SDK 54. Uses Codestral specifically because it is trained heavily on code and produces significantly fewer syntax and logic errors than general-purpose models.

Key constraints enforced via the system prompt:
- Zero relative imports — everything must be a single self-contained file
- Forbidden package list — packages that crash in Expo Snack (e.g. `react-native-maps`, `react-native-reanimated`) are explicitly blocked
- Exact navigator structure rules — no whitespace text nodes inside `Stack.Navigator` (a common Expo crash)
- Dark theme design tokens enforced in the prompt
- Retries up to 2 times with increasing temperature if the first attempt produces malformed JSON

---

### Agent 3 — ValidatorAgent
**Model:** None (deterministic static analysis)
**Role:** QA Engineer

Runs a set of deterministic checks against the generated code. No LLM call, so it is instant and costs nothing. Checks include:

| Check | Why |
|---|---|
| All blueprint screens present as named functions | Missing screens crash navigation |
| `NavigationContainer` present | Required for multi-screen apps |
| `createStackNavigator` present | Required for stack navigation |
| No relative imports (`./` or `../`) | Expo Snack can't resolve them |
| `export default` present | App won't load without it |
| `StyleSheet.create` present | Structural completeness |
| No forbidden packages | Snack-incompatible packages crash silently |
| No JSX whitespace expressions `{' '}` inside Navigator | Causes "found ' '" crash |

Errors are classified as **critical** (likely crash) or **warning** (style/minor). Only critical errors trigger the FixerAgent.

---

### Agent 4 — FixerAgent *(conditional)*
**Model:** `codestral-latest`
**Role:** Debugger

Only invoked when the ValidatorAgent finds critical errors. Receives the broken code + a numbered list of specific errors and is instructed to patch only the broken parts — not rewrite from scratch. Runs up to 2 attempts, comparing remaining errors after each pass.

This agent being conditional means clean generations skip it entirely, keeping the pipeline fast.

---

### Agent 5 — DeployerAgent
**Model:** None (external API)
**Role:** DevOps

Publishes the final code to **Expo Snack** via their save API, merges dependencies with the correct SDK 54 versions, and generates a QR code (via the `qrcode` package) for scanning on a real device.

Returns:
- `embedUrl` — for the in-app iframe preview
- `snackUrl` — shareable link to Expo Snack
- `qrUrl` — base64 PNG QR code for scanning in Expo Go

---

### Pipeline Streaming

The entire pipeline runs inside a single `ReadableStream` returned as a `text/event-stream` response. Each agent emits SSE events before and after it runs:

```
data: {"agent":"planner","status":"running","detail":"Designing app architecture…"}
data: {"agent":"planner","status":"done","detail":"4 screens · medium","blueprint":{...}}
data: {"agent":"coder","status":"running","detail":"Writing React Native code…"}
data: {"agent":"coder","status":"done","detail":"342 lines · 1 file"}
data: {"agent":"validator","status":"running","detail":"Reviewing code quality…"}
data: {"agent":"validator","status":"done","detail":"All checks passed ✓"}
data: {"agent":"fixer","status":"skipped","detail":"No critical issues — skipped"}
data: {"agent":"deployer","status":"running","detail":"Publishing to Expo Snack…"}
data: {"agent":"deployer","status":"done","detail":"Live on Expo! 🎉"}
data: {"type":"complete","files":{...},"snackData":{...}}
```

The browser reads this stream with `fetch` + `ReadableStream.getReader()` and updates the pipeline card message in real time as each event arrives.

---

## Conversational Clarification

Before the build pipeline starts, Rocketship runs a short conversational Q&A to gather requirements. This produces a significantly richer prompt for the PlannerAgent.

**Flow:**

1. User sends initial prompt (`"Fitness tracker"`)
2. `POST /api/clarify` → Mistral Small generates 3 targeted questions covering:
   - Target audience
   - Core feature priority
   - Visual style / tone
3. Questions appear as individual chat messages, one at a time
4. User types free-text answers into the normal input box
5. After all 3 answers, the original prompt is enriched:

```
Fitness tracker

User preferences:
- Who will use this app: Just me, for my morning runs
- What's the top priority feature: Detailed stats and weekly history
- What visual style do you prefer: Clean and minimal, dark theme
```

6. This enriched string is passed as the prompt to `/api/build`

The user can skip the Q&A at any time via "Skip questions →" in the input footer, in which case answers collected so far are still used.

If `/api/clarify` fails for any reason, the system silently falls through to the build pipeline with the original prompt — no broken state.

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/clarify` | POST | Generate 3 clarifying questions for a prompt |
| `/api/build` | POST | Run the full 5-agent SSE pipeline |
| `/api/plan` | POST | PlannerAgent only (standalone) |
| `/api/generate` | POST | CoderAgent + optional internal FixerAgent |
| `/api/fix` | POST | FixerAgent only (standalone) |
| `/api/deploy-snack` | POST | Publish to Expo Snack, return embed/QR URLs |
| `/api/project` | GET | Load saved project files by ID |
| `/api/project` | POST | Save or update project files |

`/api/build` is the primary endpoint used by the UI. The individual agent routes (`/api/plan`, `/api/generate`, `/api/fix`) exist as standalone endpoints for flexibility and were the original architecture before the unified pipeline was introduced.

---

## Code Validation & Auto-Fix System

`app/api/utils.js` contains the shared validation and deterministic fix logic used by both the ValidatorAgent and as a pre-pass before every Snack deployment.

### `validateAppCode(code, blueprint)`
Runs all static checks and returns an array of error strings. Called by the ValidatorAgent in `/api/build` and by the generate route when `skipInternalFix` is false.

### `autoFixCode(code)`
Deterministic string-level patches applied to every generated file before validation and before Snack deployment:

- Strips `.js` extensions from npm import paths
- Injects `export default` if missing
- Removes all JSX whitespace expressions (`{' '}`, `{""}`)
- Removes JSX comments (`{/* ... */}`)
- Runs a **line-by-line state machine** (`fixNavigatorChildren`) to strip any non-`Stack.Screen` children from inside `Stack.Navigator` blocks — this is the most complex fix and handles multi-line `screenOptions` with arrow functions correctly

### `sanitizeDependencies(dependencies, code)`
Pins all dependencies to SDK 54 compatible versions using `bundledNativeModules.json` as the source of truth. Strips packages not actually imported in the code. Always injects navigation deps if `NavigationContainer` is found.

---

## Project Persistence

Generated app files are persisted server-side so the user's work survives page refreshes.

**Storage:** JSON files on disk at `data/projects/<uuid>.json`

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "files": {
    "App.js": "import React, { useState } from 'react';\n..."
  },
  "updatedAt": "2026-02-28T10:23:45.000Z"
}
```

**Client-side:** The project UUID is stored in `localStorage` under the key `rocketship_project_id`. On page load, the app reads this key, fetches the stored files from `/api/project`, and restores the code view — so the user's last generated app is always available.

**Iteration:** When the user sends a follow-up prompt (e.g. "add a dark mode toggle"), the current `App.js` is loaded from the server and passed to the CoderAgent as `existingCode`, so the model updates the existing code rather than regenerating from scratch.

**Security:** Project IDs are sanitized server-side (`/[^a-zA-Z0-9\-_]/g` strip) before being used as file names, preventing path traversal attacks.

---

## Frontend Architecture

The UI is a single Next.js page split into two panels.

### Left panel — Chat
Manages a `messages` array where each message can be one of several types:

| Message type | Rendered as |
|---|---|
| `role: 'user'` | Orange right-aligned bubble |
| `isLoading: true` | Bouncing dot animation |
| `questionMeta` present | Question bubble with `QUESTION N OF 3` badge + orange border |
| `agentSteps` present | Live `PipelineCard` component |
| `blueprint` present | Legacy blueprint card (for old sessions) |
| Default assistant | Plain text bubble |

### `PipelineCard` component
Renders the 5-agent pipeline steps as a live-updating card. Each step row has:
- Animated orange pulse dot (running) / green ✓ (done) / grey `–` (skipped) / red ✗ (error)
- Agent label and detail text
- Expands the Planner row to show the full blueprint (screen list, complexity, estimated lines) when the Planner step completes

Updates are applied by matching the pipeline message by ID in the `messages` array:
```typescript
setMessages(prev => prev.map(m => {
  if (m.id !== pipelineId) return m;
  const newSteps = m.agentSteps.map(s =>
    s.agent === event.agent ? { ...s, status: event.status, detail: event.detail } : s
  );
  return { ...m, agentSteps: newSteps };
}));
```

### Right panel — Preview / Code
- **Preview tab:** Expo Snack iframe embed
- **Code tab:** File tree sidebar + syntax-highlighted code viewer with copy button
- While the pipeline runs: cycling loading GIFs + animated status messages

### Clarification state
A `clarifyState` object tracks the active Q&A session:
```typescript
{
  originalPrompt: string;
  questions: ClarificationQuestion[];
  answers: Record<string, string>; // qId → free-text answer
  currentIndex: number;            // which question we're on
}
```
When `clarifyState` is set, the `handleGenerate` function routes input as an answer rather than a new prompt.

---

## Getting Started

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Add your MISTRAL_API_KEY (see Environment Variables)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.
The builder is at [http://localhost:3000/build](http://localhost:3000/build).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MISTRAL_API_KEY` | Yes | Mistral API key from [console.mistral.ai](https://console.mistral.ai) |

---

## Project Structure

```
rocket-ship/
├── app/
│   ├── page.tsx                  # Landing page (/)
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles + animations
│   ├── build/
│   │   └── page.tsx              # Builder UI (/build)
│   └── api/
│       ├── clarify/route.js      # Conversational Q&A agent
│       ├── build/route.js        # SSE pipeline orchestrator (5 agents)
│       ├── plan/route.js         # PlannerAgent (standalone)
│       ├── generate/route.js     # CoderAgent (standalone)
│       ├── fix/route.js          # FixerAgent (standalone)
│       ├── deploy-snack/route.js # Expo Snack deployment
│       ├── project/route.ts      # Project persistence CRUD
│       ├── utils.js              # Shared: validateAppCode, autoFixCode, sanitizeDependencies
│       └── bundledNativeModules.json  # Expo SDK 54 pinned dependency versions
├── lib/
│   └── projectState.ts           # File system persistence service
├── data/
│   └── projects/                 # Generated project JSON files (git-ignored)
├── public/
│   ├── rocket.png
│   └── *.gif                     # Loading animations
├── next.config.ts
└── package.json
```
