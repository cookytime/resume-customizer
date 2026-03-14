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
tests/
  blob-readwrite.test.mjs — Vercel Blob read/write cycle + path encoding tests
  e2e-api.test.mjs        — Full E2E: Auth0 + storage + jobs API tests
  playwright/              — Playwright browser tests
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

## Vercel Blob Usage

**CRITICAL — READ THIS BEFORE TOUCHING ANY API ROUTE:**

Never use `encodeURIComponent()` on blob pathnames. The `@vercel/blob` SDK handles URL encoding internally. Pre-encoding causes double-encoding (`%7C` → `%257C`) which makes `get()` return empty objects silently. This bug is invisible — no errors, no warnings, just silent data loss.

```js
// WRONG — get() returns {} silently, data appears lost
const path = `users/${encodeURIComponent(userSub)}/data.json`;

// CORRECT — SDK handles encoding
const path = `users/${userSub}/data.json`;
```

Auth0 user subs contain `|` characters (e.g. `auth0|abc123`). If you encode them, the pipe becomes `%7C`, then the SDK encodes again to `%257C`. The `put()` stores at the wrong path and `get()` can't find it.

**Before modifying any API route that uses `@vercel/blob`, grep for `encodeURIComponent` and remove it if found in path construction.**

## MANDATORY: Test Your Code

**Every code change MUST be tested before claiming completion. No exceptions.**

Claude Code has repeatedly shipped broken code by skipping tests. This wastes the user's time. Follow these steps IN ORDER after every change:

### Step 1: Build (MUST pass)
```bash
npm run build
```
If this fails, fix it before doing anything else.

### Step 2: Run automated tests (MUST pass)
```bash
node --env-file=.env.local tests/blob-readwrite.test.mjs       # Blob read/write + path encoding
node --env-file=.env.local tests/e2e-api.test.mjs              # Full E2E: Auth0 + storage + jobs
npx playwright test --config=tests/playwright.config.mjs       # Browser smoke tests
```
If any test fails, fix the code and re-run. Do NOT skip failing tests.

### Step 3: Deploy to preview (NOT production)
```bash
npx vercel deploy --yes    # Preview only — NEVER --prod without explicit user approval
```

### Step 4: Verify the preview deployment
- All pages return 200 (/, /login, /dashboard)
- No errors in runtime logs
- API routes respond correctly

### Step 5: Only deploy to production after user approval
```bash
npx vercel deploy --prod --yes
```

**If you cannot run the tests (e.g. no dev container, no env vars), SAY SO. Do not pretend the tests passed. Do not claim the task is complete without test results.**

## Pre-Deployment Verification (MANDATORY)

**NEVER claim a task is complete or deploy to production without verifying your work.**

### 1. Automated Tests (ALL must pass before any deploy)
```bash
npm run build                                                  # Must compile cleanly
node --env-file=.env.local tests/blob-readwrite.test.mjs       # Blob read/write cycle
node --env-file=.env.local tests/e2e-api.test.mjs              # Full E2E: Auth0 user + storage + jobs
```

### 2. Deploy to Preview First
```bash
npx vercel deploy --yes    # Preview, NOT --prod
```
Then verify using `mcp__claude_ai_Vercel__web_fetch_vercel_url` and `mcp__claude_ai_Vercel__get_runtime_logs`:
- All pages return 200 (/, /login, /dashboard)
- No errors or warnings in runtime logs
- API routes respond (GET /api/storage, GET /api/jobs)

### 3. Manual Verification Checklist (before promoting to prod)
The following MUST be verified by the user or via end-to-end tests before deploying to production:
- [ ] New user sees resume upload/paste setup screen
- [ ] Resume uploads work (PDF, DOCX, Markdown, paste)
- [ ] Resume persists across page reload (does NOT re-ask for upload)
- [ ] Job description analysis generates interview questions
- [ ] Interview answers produce tailoring guidance
- [ ] DOCX resume downloads with professional formatting, no AI speak
- [ ] Resume content matches VOICE_PROFILE rules (no banned phrases)
- [ ] "Save to Job Tracker" saves and appears on Dashboard
- [ ] Dashboard displays all tracked jobs correctly
- [ ] Edit Profile modal works (including file import)

### 4. Resume Output Quality
Every generated resume MUST:
- Use professional design and formatting
- Contain NO AI speak or banned phrases (see VOICE_PROFILE in App.jsx)
- Be verified by reading the actual output before considering the task done

### 5. Only Then Deploy to Production
```bash
npx vercel deploy --prod --yes
```
Then check runtime logs again for errors.

## Known Gotchas

1. **Blob path encoding** — See "Vercel Blob Usage" section above. This has caused bugs multiple times.
2. **`get()` throws on missing blobs** — `@vercel/blob`'s `get()` throws `BlobNotFoundError` for new users. Always wrap in try/catch and return sensible defaults.
3. **Auth0 subs have pipe characters** — `auth0|abc123` format. Never encode these in blob paths.
4. **Dev environment runs in a container** — Use the devcontainer for all build/test/run commands. `npm` is not available on the Windows host.
