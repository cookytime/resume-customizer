# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resume Customizer is a Next.js 14 (App Router) application that helps tailor resumes to job descriptions using Claude AI. Users paste a job description, answer AI-generated interview questions, and receive tailored resume guidance and downloadable DOCX resumes.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build (outputs standalone mode)
- `npm run start` — Start production server
- `npm run lint` — Run Next.js linting

There is no test framework configured. `npm run lint` is the only code quality check available.

## Development Setup

1. Clone the repository
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in the secrets (see [Environment Variables](#environment-variables))
4. `npm run dev` to start the dev server

## Architecture

**Single-page app with server-side auth.** The app is a single client component (`src/App.jsx`) mounted by a server-rendered page (`app/page.jsx`) that handles Auth0 session checks.

### Directory Structure

```
app/                          # Next.js App Router
├── api/
│   ├── anthropic/v1/messages/route.js   # Anthropic API proxy
│   └── storage/route.js                 # Vercel Blob storage API
├── login/page.jsx            # Login/signup page (redirects if already authenticated)
├── layout.js                 # Root layout with metadata
├── page.jsx                  # Main page (server component, Auth0 session check)
└── globals.css               # Tailwind CSS directives
lib/
└── auth0.js                  # Auth0 client singleton (server SDK)
src/
└── App.jsx                   # Entire client-side application (~1150 lines, monolithic)
middleware.js                 # Auth0 middleware, runs on all non-static routes
```

### Key Files

- `src/App.jsx` — The entire client-side application (~1150 lines). Contains all UI, state management, Claude API calls, DOCX generation, and multi-step wizard logic. This is a monolithic component.
- `app/page.jsx` — Server component, checks Auth0 session, renders auth status bar + mounts `<ResumeCustomizer />`
- `app/login/page.jsx` — Login/signup page; redirects to `/` if user is already authenticated
- `app/layout.js` — Root layout with page metadata
- `lib/auth0.js` — Auth0 client singleton using `@auth0/nextjs-auth0` (server SDK)
- `middleware.js` — Auth0 middleware, runs on all non-static routes
- `interview_questions.json` — Pre-cached interview questions used for seeding

### API Routes

- `app/api/anthropic/v1/messages/route.js` — Proxy to Anthropic Messages API. The client calls this instead of Anthropic directly to keep the API key server-side. Reads `ANTHROPIC_API_KEY` or `VITE_ANTHROPIC_API_KEY` from env.
- `app/api/storage/route.js` — Per-user persistent storage via Vercel Blob. GET/PUT/DELETE operations scoped to authenticated user's `sub`. Stores profile, saved applications, and learned skills.

### Application Flow (in src/App.jsx)

1. **Loading** — Fetches user storage from `/api/storage`
2. **Profile setup** — User enters resume text (hardcoded default) and optional LinkedIn URL
3. **Job description** — User pastes job posting
4. **Interview** — Claude generates targeted questions based on resume + job description; user answers
5. **Tailoring** — Claude produces section-by-section resume customization guidance
6. **Review** — Displays tailored resume with DOCX export (using `docx` + `file-saver` libraries)

### Data Persistence

All data is stored in Vercel Blob (no database) at `users/{userSub}/resume-data.json`. The storage structure:

```json
{
  "version": "<STORAGE_VERSION>",
  "profile": null,
  "savedApplications": [],
  "learnedSkills": {},
  "skillsSeeded": false
}
```

- `learnedSkills` — Skills/proficiencies extracted from interview answers, persisted and reused across applications
- `savedApplications` — Past job applications stored with job title, company, date, and tailoring results
- `profile` — User's resume text and optional LinkedIn URL

## Environment Variables

See `.env.local.example` for the template. Required variables:

| Variable | Description | Notes |
|---|---|---|
| `AUTH0_DOMAIN` | Auth0 tenant domain | In `.env.local.example` |
| `AUTH0_CLIENT_ID` | OAuth client ID | In `.env.local.example` |
| `AUTH0_CLIENT_SECRET` | OAuth client secret | Server-side only |
| `AUTH0_SECRET` | Session encryption secret | Generate with `openssl rand -hex 32` |
| `APP_BASE_URL` | Application base URL | e.g. `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Claude API key | Server-side only; not in example file |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | Required for storage; not in example file |

## Docker

The app includes Docker support with a multi-stage build:

- **Dockerfile** — Three-stage build (deps, builder, runner) using `node:20-alpine`. Produces a standalone Next.js server on port 3000.
- **docker-compose.yml** — Single `app` service, maps port `8080:80`, passes `VITE_ANTHROPIC_API_KEY` from env.

## Tech Stack

- **Framework:** Next.js 14 with App Router, standalone output mode
- **Styling:** Tailwind CSS 3
- **Auth:** Auth0 via `@auth0/nextjs-auth0` v4
- **AI:** Anthropic Claude API (proxied through server route)
- **Storage:** Vercel Blob (`@vercel/blob`) — no traditional database
- **DOCX generation:** `docx` + `file-saver`
- **Icons:** `lucide-react`
- **Deployment:** Vercel (with Docker support via multi-stage Dockerfile)

## Conventions

- **Monolithic client component:** All client-side UI and logic lives in `src/App.jsx`. New UI features go here rather than creating separate component files.
- **Server components for auth only:** Server components (`app/page.jsx`, `app/login/page.jsx`) handle Auth0 session checks and render minimal shell UI. All interactive UI is in the client component.
- **API proxy pattern:** The client never calls external APIs directly. Server-side API routes proxy requests to keep secrets out of the browser.
- **Per-user storage scoping:** All Vercel Blob operations are scoped to the authenticated user's Auth0 `sub` claim.
- **No test suite:** There are currently no tests. Use `npm run lint` for basic validation.
