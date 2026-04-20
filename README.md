# Personal Blog Platform

A Python + React personal blog platform built for an internship submission.

It includes:
- Clerk authentication
- public home feed and profile pages
- search
- rich post editor with drafts and publishing
- creator dashboard and settings
- analytics, follows, and timeline APIs
- Docker-based local setup

## Main Submission App

Use these folders for review:
- `blog-frontend`: main React/Vite frontend
- `blog_backend`: main FastAPI backend
- `docker-compose.yml`: easiest way to run the full stack

Other folders are kept only as side experiments or references:
- `clerk-nextjs-app`: Clerk sample app used during auth exploration
- `gallery`, `shaders-on-scroll`: visual experiments, not required for the main submission

## Quick Start

1. Copy env templates and add your own keys.

```bash
cp .env.example .env
cp blog-frontend/.env.example blog-frontend/.env
cp blog_backend/.env.example blog_backend/.env
```

2. Start the app:

```bash
docker compose up --build
```

3. Open:
- Frontend: `http://localhost:5173`
- API gateway: `http://localhost:8002`
- Auth service docs: `http://localhost:8003/docs`

## Demo Content

The Docker stack includes a `seed-service` that automatically creates:
- an admin user
- five welcome posts

Default seeded admin credentials:
- email: `admin@example.com`
- password: value from `WELCOME_ADMIN_PASSWORD` in `.env`

This makes the site non-empty for reviewers on first run.

## Features

- Sign up and sign in with Clerk
- Read public posts from the feed
- Search posts by title, author, tag, and excerpt
- Open author profiles and published stories
- Create, edit, save drafts, and publish posts
- View creator dashboard stats and draft shelf
- Update creator profile/settings
- Follow and unfollow creators

## Notes For Reviewers

- Kafka is optional in this local setup. If it is unavailable, the app falls back to direct event dispatch.
- The root `.env` and nested `.env` files in this repo are placeholders only. Replace them with your own keys before running.

## Project Structure

```text
.
├── blog-frontend/
├── blog_backend/
├── docker-compose.yml
├── .env.example
└── README.md
```
