<div align="center">
  
  # 🚀 DevCollaborator Workspace OS
  
  **The ultimate real-time collaboration and project management platform built for modern development teams.** <br/>
  Features an integrated Hybrid AI complexity engine, live Socket.IO interactions, and personalized project recommendations.
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-DevCollaborator-2563eb?style=for-the-badge)](https://dev-collaborator-frontend.vercel.app/)
  [![Tech Stack](https://img.shields.io/badge/Stack-MERN_|_Next.js-10b981?style=for-the-badge)](#tech-stack)

</div>

---

## 🎯 Overview

DevCollaborator is a full-stack, monorepo workspace platform that goes beyond simple Kanban boards. Built to simulate a real collaborative marketplace, it bridges the gap between project management and developer matching.

With **Live Socket.IO updates**, intelligent **Gemini 2.5 Pro Hybrid AI predictions**, and an automated **Skills-based Matchmaking System**, DevCollaborator is designed to help teams ship faster while ensuring every developer works on projects aligned with their passions.

> **Live Deployment**: [https://dev-collaborator-frontend.vercel.app/](https://dev-collaborator-frontend.vercel.app/)

---

## ✨ Core Features

### 🧠 1. Hybrid AI Task Complexity Prediction
A dual-engine predictive model that analyzes tasks to estimate **effort, hours, and complexity**.
- **Heuristic Engine:** Rules-based parsing of title, description, priority, and GitHub issue tags (70% weight).
- **Gemini 2.5 Pro Integration:** Generative AI deeper context analysis with human-readable rationale (30% weight).
- **ML-Ready:** Every prediction tracks inputs vs actual outcomes to form a persistent training dataset for future models.

### ⚡ 2. Real-Time Collaboration (Socket.IO)
No more refreshing the page. Everything is instant.
- **Live Comments:** See team members typing and dropping comments in real-time.
- **Task Status Sync:** Drag a task across the board and instantly reflect the move on everyone else's screen.
- **"Also Viewing" Presence:** See avatars of other project members currently looking at the same task detail page.
- **Global Toasts:** Receive instant notifications globally for `@mentions` and assignments.

### 🤝 3. Smart Project Recommendation System
A 6-factor algorithmic engine recommending open projects to users.
- **Scoring Breakdown:** Skill Match (30%), Interest Match (20%), Project Activity (15%), Availability Match (15%), Role Fit (10%), Openness (10%).
- **Interactive UI:** Dynamic breakdown showing exactly *why* a project was recommended with animated SVG score rings.

### 🏢 4. Multi-Tenant Organization Architecture
- Seamlessly manage multiple organizations under one account.
- Role-based access control (RBAC) supporting `owner`, `admin`, `manager`, `developer`, and `viewer` specific permissions.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router) + React
- **Styling:** Tailwind CSS + Vanilla CSS (Glassmorphism & Micro-animations)
- **Real-Time:** Socket.IO Client

### Backend
- **Framework:** Node.js + Express
- **Database:** MongoDB + Mongoose (ACID transactions used for project creation & complex writes)
- **AI Integration:** `@google/genai` (Gemini 2.5 Pro)
- **Real-Time:** Socket.IO Server
- **Authentication:** JWT (JSON Web Tokens) with HttpOnly cookies

---

## 🏗️ Project Architecture (Monorepo)

```text
devcollab/
├── devcollab-backend/         # Express API & Socket Server
│   ├── src/
│   │   ├── controllers/       # Route logic (Auth, Tasks, Projects, etc)
│   │   ├── models/            # Mongoose schemas (ML-ready prediction models)
│   │   ├── services/          # Business logic (Gemini AI, Recommendation Engine)
│   │   ├── socket/            # Real-time WebSockets
│   │   └── app.js             # Express setup
│   └── .env                   # Environment variables
│
└── devcollab-frontend/        # Next.js Application
    ├── src/
    │   ├── app/               # Next.js App Router pages
    │   ├── components/        # Reusable UI components (AppShell, Badges, Modals)
    │   ├── context/           # React Context (Auth, SocketProvider)
    │   └── lib/               # Utility functions (API client wrapper)
    └── tailwind.config.js
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- MongoDB connection string
- Google Gemini API Key (Free tier at [Google AI Studio](https://aistudio.google.com/app/apikey))

### 1. Setup Backend
```bash
cd devcollab-backend
npm install

# Create .env file based on example
cp .env.example .env

# Start the development server (runs on port 8000)
npm run dev
```

### 2. Setup Frontend
```bash
cd devcollab-frontend
npm install

# Configure environment variable pointing to local backend
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1" > .env.local

# Start the Next.js development server
npm run dev
```

---

## 💡 Engineering Highlights for Recruiters

- **Performance-First Realtime:** Designed Socket.IO rooms per task (`task_{taskId}`) rather than broadcasting globally, keeping web socket traffic minimal and optimized.
- **Graceful Degradation:** The AI Complexity engine uses `Promise.all` with a strict `AbortController` timeout (15s) for the Gemini API call. If Gemini fails or times out, it silently degrades back to the 100% Heuristic model, ensuring zero downtime for the user.
- **Atomic Operations:** Uses MongoDB Sessions & Transactions (`mongoose.startSession()`) for critical path endpoints (like Project Creation) ensuring data integrity across multiple collections.

---
*Built with passion, robust design patterns, and modern tooling.*
