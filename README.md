# APPLY — Automated Placement & Letter/cv Yielding agent

Electron + React + TypeScript desktop application that helps students in their work-study (apprenticeship/internship) job search by fetching real job postings, tailoring the resume, and generating personalized cover letters using AI.

---

## Overview

APPLY is a smart application assistant that:
1. **Fetches** real work-study job postings from the official France Travail (Pôle Emploi) API
2. **Tailors** your resume to each selected posting using AI (Groq — Llama 3.3 70B)
3. **Generates** a personalized cover letter for each posting
4. **Tracks** your applications on an interactive Kanban board
5. **Orchestrates** tasks via Jules (Google) as an autonomous execution engine

> APPLY is **not** a bot that applies on your behalf (`autoApply: false`). It provides you with tailored documents so you can apply yourself, with the best possible application package.

---

## Tech stack

| Layer | Technologies |
|--------|-------------|
| Desktop | Electron 28, IPC, contextBridge, System Tray |
| Frontend | React 18, strict TypeScript, Tailwind CSS, Vite |
| Persistence | SQLite (better-sqlite3) |
| AI | Groq API — `llama-3.3-70b-versatile` (free) |
| Scraping | France Travail API v2 (official OAuth2) |
| Orchestration | Jules (Google) — autonomous AI agent |
| Architecture | MVC — separation of UI / Logic / Data |

---

## Installation

### Prerequisites
- Node.js 20+
- npm 10+
- Free Groq API key — [console.groq.com](https://console.groq.com)
- France Travail credentials — [francetravail.io/data/api](https://francetravail.io/data/api)
- Jules key (optional) — [jules.google.com](https://jules.google.com)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Brenn007/APPLY.git
cd APPLY

# 2. Install dependencies
npm install

# 3. Rebuild better-sqlite3 for Electron
npx electron-rebuild -f -w better-sqlite3

# 4. Configure environment variables
cp .env.example .env
# Fill in the keys in .env (see Configuration section)

# 5. Run in development mode
npm start

# 6. Build the application
npm run build
```

---

## MVC Architecture

```
APPLY/
├── electron/                     # MAIN PROCESS (Node.js)
│   ├── main.ts                   # Entry point — window, tray, dotenv, lifecycle
│   ├── preload.ts                # Secure bridge — exposes electronAPI via contextBridge
│   └── ipc/
│       ├── dbHandlers.ts         # Model — SQLite CRUD (offers, applications, logs, jules_tasks)
│       ├── scrapeHandlers.ts     # Controller — Scraping via the France Travail API
│       └── agentHandlers.ts      # Controller — AI generation via Groq
│
├── src/                          # RENDERER PROCESS (React)
│   ├── App.tsx                   # Root view — navigation, layout, titlebar
│   ├── views/
│   │   ├── Dashboard.tsx         # Statistics, Jules status, activity log
│   │   ├── OffersView.tsx        # Job listing + resume/letter generation
│   │   ├── ApplicationsView.tsx  # Kanban board of applications
│   │   └── SettingsView.tsx      # API key configuration, student profile
│   ├── components/
│   │   ├── OfferCard.tsx         # Job posting card
│   │   ├── OfferList.tsx         # Filtered list of postings
│   │   ├── CvPreview.tsx         # Preview of the generated resume
│   │   ├── CoverLetterPreview.tsx # Preview of the cover letter
│   │   ├── StatusBadge.tsx       # Status and platform badges
│   │   └── KanbanBoard.tsx       # Kanban with native drag & drop
│   ├── store/
│   │   └── applyStore.ts         # Global store (module-level state + React hooks)
│   └── types/
│       └── electron.d.ts         # TypeScript types for window.electronAPI
│
├── agents-config/
│   └── apply.json                # Agent configuration
├── user-profile/
│   ├── cv-base.md                # Base resume in markdown
│   └── profile.json              # Student profile (email, phone, skills...)
└── mocks/
    └── job-offers.json           # 15 fallback postings (if France Travail is unavailable)
```

### Architecture rules

- **The renderer never touches Node.js directly** — all communication goes through `window.electronAPI` (contextBridge)
- **Zero UI freeze** — scraping, AI calls, and SQLite operations run in the main process via IPC
- **Strict TypeScript** — no `any`, all components and handlers are typed
- **Separation of concerns** — each IPC handler has a single responsibility
- **Automatic fallback** — if France Travail is unavailable, the mocks take over without crashing

---

## Features

### Fetching postings (France Travail)
- Calls to the official France Travail API v2 (OAuth2 client credentials)
- Searches for developer work-study postings in department 31 (Toulouse)
- Automatic deduplication by URL in SQLite
- Falls back to 15 mocked postings if credentials are missing
- Real-time progress bar via IPC events
- UI filters: platform, status

### Resume tailoring
- Reads `user-profile/cv-base.md` + `user-profile/profile.json`
- Up-to-date contact details (email, phone) are injected into the prompt
- Generation via Groq (Llama 3.3 70B) with an HR-optimized prompt
- Markdown preview in the UI
- Copy and Save buttons (`outputs/cv-[company]-[date].md`)

### Cover letter generation
- Personalization: first/last name, company, exact job title, detected values
- Profile email and phone used automatically
- Sober, professional tone, 350 words maximum
- Saved to `outputs/lm-[company]-[date].md`

### Kanban tracking
- 6 columns: Draft → Sent → Viewed → Interview → Rejected → Accepted
- Native drag & drop between columns (no external dependency)
- Orange visual alert after 7+ days without a response on a sent application
- Free-form editable notes on each application

### Jules Dashboard
- Jules connection status (connected / not configured)
- Current task with animated loader
- Daily quota (15 tasks/day on the free plan)
- History of recently executed tasks (type, status, duration)

### System Tray
- APPLY icon in the Windows notification area
- Context menu: Open | Start scraping | Quit
- Native notifications (new postings found, pending applications)

---

## SQLite database

Stored in `%APPDATA%/apply/apply.db` (Windows).

```sql
job_offers    -- Postings fetched from France Travail, with status and metadata
applications  -- Applications linked to postings (Kanban)
jules_tasks   -- History of orchestrated tasks (scraping, resume, letter)
logs          -- Agent activity log
settings      -- API key and local configuration
```

---

## Configuration

Create a `.env` file at the project root (copied from `.env.example`):

```env
# Jules (Google) — Autonomous task orchestrator
JULES_API_KEY=AQ.xxx...

# Groq — Free AI generation (Llama 3.3 70B)
# Sign up: https://console.groq.com → "Create API Key"
GROQ_API_KEY=gsk_...

# France Travail — Scraping real job postings
# Sign up: https://francetravail.io/data/api → create an application
# → add the "Offres d'emploi v2" API
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
```

The Groq key can also be entered directly in **Settings → Groq API Key** in the application (stored in SQLite, never exposed to the renderer).

### Student profile
Editable in **Settings → Student Profile** or directly in `user-profile/profile.json`.
Includes: first name, last name, email, phone, school, education level, target position, availability.

---

## Recommended workflow

1. **Start scraping** → France Travail postings appear in the Offers tab
2. **Select a posting** → read the description
3. **Tailor the resume** → the AI generates a targeted version → Copy/Save
4. **Generate the letter** → personalized letter with your contact details → Copy/Save
5. **Apply manually** on the company's website with your documents
6. **Create an application** → it appears on the Kanban board as "Draft"
7. **Move it to "Sent"** once the application has been sent
8. **Track progress** → move it along as you get updates (Viewed, Interview, etc.)
9. **Automatic alerts** → if there's no response after 7 days

---

## Author

**Brenn MAKOUYA**
