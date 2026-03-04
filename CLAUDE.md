# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resume Customizer is a Next.js 14 (App Router) application that helps tailor resumes to job descriptions using Claude AI. Users paste a job description, answer AI-generated interview questions, and receive tailored resume guidance and downloadable DOCX resumes.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build (outputs standalone mode)
- `npm run start` — Start production server
- `npm run lint` — Run Next.js linting

## Architecture

**Single-page app with server-side auth.** The app is a single client component (`src/App.jsx`) mounted by a server-rendered page (`app/page.jsx`) that handles Auth0 session checks.

### Key Files

- `app/page.jsx` — Server component, checks Auth0 session, renders auth UI + mounts `<ResumeCustomizer />`
- `src/App.jsx` — The entire client-side application (~900 lines). Contains all UI, state management, Claude API calls, DOCX generation, and multi-step wizard logic. This is a monolithic component.
- `lib/auth0.js` — Auth0 client singleton using `@auth0/nextjs-auth0` (server SDK)
- `middleware.js` — Auth0 middleware, runs on all non-static routes

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

- `learnedSkills` — Skills/proficiencies extracted from interview answers, persisted and reused across applications
- `savedApplications` — Past job applications stored with job title, company, date, and tailoring results
- All data stored in Vercel Blob at `users/{userSub}/resume-data.json`

## Environment Variables

See `.env.local.example` for required variables:
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` — Auth0 configuration
- `APP_BASE_URL` — Application base URL
- `ANTHROPIC_API_KEY` — Claude API key (server-side only)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage token

## Tech Stack

- **Framework:** Next.js 14 with App Router, standalone output mode
- **Styling:** Tailwind CSS 3
- **Auth:** Auth0 via `@auth0/nextjs-auth0` v4
- **AI:** Anthropic Claude API (proxied through server route)
- **Storage:** Vercel Blob (`@vercel/blob`)
- **DOCX generation:** `docx` + `file-saver`
- **Icons:** `lucide-react`
- **Deployment:** Vercel (with Docker support via multi-stage Dockerfile)
