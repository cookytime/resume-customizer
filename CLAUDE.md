# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resume Customizer is a Next.js 14 (App Router) single-page application that tailors resumes to job descriptions using Claude AI. Users paste a job description, answer AI-generated interview questions, and receive tailored resume guidance with downloadable DOCX exports.

## Commands

- `npm run dev` — Start development server (port 3000)
- `npm run build` — Production build (standalone output mode)
- `npm run start` — Start production server
- `npm run lint` — Run Next.js linting

## Architecture

**Single-page app with server-side auth.** One monolithic client component (`src/App.jsx`) mounted by a server-rendered page (`app/page.jsx`) that handles Auth0 session checks.

### File Structure

```
app/
  page.jsx              — Server component: Auth0 session check, renders <ResumeCustomizer />
  login/page.jsx        — Login/signup page with Auth0 redirect
  layout.js             — Root layout (includes NavBar)
  api/
    anthropic/v1/messages/route.js — Proxy to Anthropic Messages API (keeps API key server-side)
    jobs/route.js        — Job pipeline CRUD (per-user job tracking)
    storage/route.js     — Per-user CRUD via Vercel Blob, scoped by Auth0 `sub`
    summarize-job/route.js — JD summarization via local Ollama LLM (opt-in via ENABLE_OLLAMA)
src/
  App.jsx               — Main client app: UI, state, API calls, DOCX gen, wizard
  NavBar.jsx             — Navigation bar component
  Dashboard.jsx          — Dashboard component
lib/
  auth0.js              — Auth0 client singleton (@auth0/nextjs-auth0 server SDK)
middleware.js            — Auth0 middleware on all non-static routes
next.config.js           — Standalone output mode
```

### Application Flow (in src/App.jsx)

1. **Loading** — Fetches user storage from `/api/storage`
2. **Profile setup** — User enters resume text and optional LinkedIn URL
3. **Job description** — User pastes job posting
4. **Interview** — Claude generates targeted questions; user answers
5. **Tailoring** — Claude produces section-by-section resume customization guidance
6. **Review** — Displays tailored resume with DOCX export

### Data Persistence

All data stored in Vercel Blob at `users/{userSub}/resume-data.json`:
- `learnedSkills` — Skills extracted from interview answers, reused across applications
- `savedApplications` — Past applications with job title, company, date, and tailoring results

## Environment Variables

See `.env.local.example` for required variables:
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` — Auth0 config
- `APP_BASE_URL` — Application base URL
- `ANTHROPIC_API_KEY` — Claude API key (server-side only, also reads `VITE_ANTHROPIC_API_KEY`)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage token
- `ENABLE_OLLAMA` — Enable local Ollama LLM for JD summarization (`true`/`false`, default `false`)
- `OLLAMA_BASE_URL` — Ollama server URL (e.g. `https://ollama.glencook.tech`)
- `OLLAMA_API_KEY` — Optional Ollama API key

## Tech Stack

- **Framework:** Next.js 14, App Router, standalone output
- **Styling:** Tailwind CSS 3
- **Auth:** Auth0 via `@auth0/nextjs-auth0` v4
- **AI:** Anthropic Claude API (proxied through `app/api/anthropic/`)
- **Storage:** Vercel Blob (`@vercel/blob`)
- **DOCX:** `docx` + `file-saver`
- **Icons:** `lucide-react`
- **Deployment:** Vercel (Docker support via multi-stage Dockerfile)

## Code Conventions

- No TypeScript — project uses plain JSX
- Playwright for end-to-end testing
- Single monolithic client component pattern in `src/App.jsx`
- Server components handle auth only; all app logic is client-side
- API routes are thin proxies (Anthropic) or simple CRUD (storage)
- Tailwind for all styling — no CSS modules or styled-components
