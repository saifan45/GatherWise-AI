# 🌟 GatherWise AI — Intelligent Event Blueprint & Planning Architecture

> **GatherWise AI** is a production-grade, AI-powered event planning platform designed for architectural precision in managing weddings, milestone birthdays, and community festivals. Powered by Google Gemini AI, it generates complete, realistic run-of-show schedules, budget breakdowns, phase-based checklists, personalized speeches, and guest logistics in seconds.

---

## 🎯 Key Highlights & Features

### 🪄 1. AI Event Blueprint Architecture
- **Instant Complete Plan Generation**: Generates comprehensive event blueprints matching specific budget ceilings, locations, guest counts, and aesthetic themes.
- **Natural Language Plan Refinement**: Modify existing plans via prompt-driven AI adjustments (e.g., *"Shift timeline 1 hour later and optimize budget for live acoustic music"*).
- **Strict Schema Enforcement**: Server-side JSON schema validation guarantees consistent structural integrity for every generated plan.

### ⏱️ 2. Interactive Run-of-Show Timeline
- **Milestone Tracking**: Chronologically ordered schedule items with category tags (`ceremony`, `reception`, `entertainment`, `food_beverage`, `speech`, `photo`, `logistics`).
- **Buffer & Duration Management**: Zone-based venue assignments, assigned coordinator roles, and configurable buffer minutes between milestones.
- **Key Milestone Badging**: Highlights critical moments (e.g., Vow Exchange, First Dance, Keynote Speeches).

### 💰 3. Smart Budget & Expense Allocation
- **Category Breakdown**: Automatic expense allocation across Venue, Catering & Bar, Photography & Video, Entertainment & Sound, Decor & Floral, Logistics & Rentals, Permits, and Contingency.
- **Estimated vs. Actual Tracking**: Real-time spending progress meters, remaining budget indicators, and over-budget warnings.
- **AI Cost-Saving Recommendations**: Actionable tips provided for each budget line item.

### ✅ 4. Phase-Based Planning Checklist
- **Timeline-Gated Milestones**: Tasks organized from **12 Months Out** down to **Day-Of** and **Post-Event Wrap-up**.
- **Role & Priority Tagging**: Priority flags (`High`, `Medium`, `Low`) and assigned roles for team delegation.

### 🎙️ 5. AI Speech & Toast Assistant
- **Tailored Speech Writing**: Generates wedding vows, father-of-the-bride toasts, keynote addresses, and invitation copy.
- **Tone Control**: Choose from `Heartfelt`, `Humorous`, `Formal`, `Inspirational`, or `Concise` tones.
- **Delivery Bullet Points**: Includes speaking tips and key takeaways for confident delivery.

### 👥 6. Guest List & RSVP Manager
- **RSVP Tracking**: Filter guests by status (`Attending`, `Declined`, `Pending`).
- **Dietary Preferences & Table Numbers**: Track dietary needs (Vegetarian, Vegan, Halal, Gluten-Free) and assign seating.

### ⚡ 7. Enterprise Reliability Engine
- **Exponential Backoff & Retries**: Automated retry mechanism handling transient network fluctuations and upstream API rate limits.
- **Input State Preservation**: Strict isolation ensures user inputs and active plans remain 100% intact during network retries.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology / Library | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | Component-driven UI with modern hooks & strong typing |
| **Styling & UI** | Tailwind CSS v4 + Framer Motion | Fluid layouts, animations, and zero-pill discipline |
| **Icons** | Lucide React | Clean, scalable UI icons |
| **Backend Server** | Node.js + Express.js (`tsx`) | RESTful API proxy handling server-side Gemini API calls |
| **AI SDK** | `@google/genai` (^2.32.0) | Official Google GenAI SDK for Gemini models |
| **AI Model** | `gemini-3.1-flash-lite` | Ultra-fast model delivering sub-10 second blueprint generation |
| **Test Runner** | Vitest | 66+ passing unit and integration tests |

---

## 📁 Project Directory Structure

```
GatherWise-AI/
├── server.ts                    # Express backend server (API Endpoints & Gemini SDK Proxy)
├── index.html                   # HTML Entry point
├── vite.config.ts               # Vite configuration with Express middleware binding
├── tsconfig.json                # TypeScript compiler config
├── metadata.json                # AI Studio applet metadata & permissions
├── package.json                 # Project dependencies & scripts
│
├── src/
│   ├── App.tsx                  # Root application component & layout state
│   ├── main.tsx                 # React DOM client entry
│   ├── index.css                # Global Tailwind CSS imports
│   │
│   ├── components/              # UI Components
│   │   ├── Navigation.tsx       # Top navigation header & tab switcher
│   │   ├── EventHero.tsx        # Event header summary & action banner
│   │   ├── EventWizardModal.tsx # AI Plan creation modal form
│   │   ├── TimelineView.tsx     # Run-of-Show timeline component
│   │   ├── BudgetTracker.tsx    # Interactive budget & spending manager
│   │   ├── ChecklistView.tsx    # Phased task checklist component
│   │   ├── SpeechInvitationGen.tsx # AI Speech & Toast generator drawer/card
│   │   ├── GuestManager.tsx     # Guest list & dietary tracker
│   │   ├── AIAdviceDrawer.tsx   # Interactive AI refinement assistant
│   │   └── ExportSummaryModal.tsx # Export blueprint (PDF/JSON/Print)
│   │
│   ├── services/
│   │   └── api.ts               # Client-side API service wrapping server endpoints
│   │
│   ├── types/
│   │   └── event.ts             # TypeScript interfaces for EventPlan, Timeline, Budget, etc.
│   │
│   ├── utils/
│   │   ├── aiRetry.ts           # Reliability engine, error classifier & exponential backoff
│   │   ├── budget.ts            # Budget calculation & summary utilities
│   │   ├── timeline.ts          # Timeline ordering & time calculation helpers
│   │   └── validation.ts        # Input sanitization & AI plan schema validators
│   │
│   └── tests/
│       ├── aiReliability.test.ts # Tests for error handling, retries, & state preservation
│       └── eventPlanning.test.ts # Tests for plan validation, budget calculations, & sorting
```

---

## 🚀 API Endpoints Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns server health status and Gemini API key configuration check |
| `POST` | `/api/events/generate-plan` | Accepts event criteria and returns a full, validated `EventPlan` object |
| `POST` | `/api/events/refine-plan` | Accepts natural language feedback to update specific plan sections |
| `POST` | `/api/events/generate-speech` | Generates structured speech content, delivery tips, and key points |

---

## 💻 Getting Started / Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Gemini API Key**: Set `GEMINI_API_KEY` in environment or `.env` file

### 2. Installation
```bash
# Clone or navigate to project directory
cd applet

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3000
```

### 4. Running Development Server
```bash
# Starts Express backend and mounts Vite dev middleware on port 3000
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Tests
```bash
# Runs Vitest unit & integration test suite
npm test
```

### 6. Production Build & Vercel Deployment
```bash
# Build frontend assets and verify TypeScript types
npm run build
```

#### Deploying on Vercel:
1. Push your repository to GitHub.
2. Import the repository into **Vercel**.
3. Add `GEMINI_API_KEY` under **Project Settings → Environment Variables**.
4. Deploy! Vercel automatically detects `vercel.json` and `api/index.ts` to host `/api/*` serverless functions and serve the React app statically.

---

## 🎓 College Presentation Highlights

If presenting this project for an academic evaluation or technical demo, emphasize:
1. **Full-Stack Architecture**: Clean separation between React SPA UI, Express API layer, and Gemini SDK integration.
2. **Defensive AI Engineering**: Fallback models (`gemini-3.1-flash-lite`), schema validation, and exponential backoff retry algorithms prevent blank screens and API failures.
3. **Real-world Practical Utility**: Tackles high-stress event logistics with instant financial calculations and chronological run-of-show scheduling.

---

### 📄 License
Licensed under the Apache-2.0 License.
