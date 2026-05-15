# Invisible AI — Admin Portal

React admin UI for the Invisible AI backend: users, UTR payment requests, Groq/Deepgram API keys, and Windows `.exe` releases.

## Setup

```bash
npm install
cp .env.example .env   # optional: override API base
npm run dev
```

## API base URL

All admin routes live under `/api` (e.g. `POST /api/admin/login`).

Default (when `VITE_API_BASE_URL` is unset):

`https://flowdesk-backend.luminoai.online/api`

Set in `.env`:

```env
VITE_API_BASE_URL=https://flowdesk-backend.luminoai.online/api
```

## Auth

- **Browser:** email + password → JWT (`Authorization: Bearer …`)
- **Automation:** `x-admin-key` (do not ship `ADMIN_API_KEY` in a public bundle)

## Docker

**Production** (nginx serving the built SPA on port 8080):

```bash
docker compose up --build
```

Open http://localhost:8080

Override API base at **build** time (Vite bakes `VITE_*` into the bundle):

```bash
VITE_API_BASE_URL=https://flowdesk-backend.luminoai.online/api docker compose up --build
```

Or build the image directly:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://flowdesk-backend.luminoai.online/api \
  -t invisible-ai-admin .
docker run --rm -p 8080:80 invisible-ai-admin
```

**Development** (Vite with hot reload on port 5173):

```bash
docker compose -f docker-compose.dev.yml up
```

Env vars: `ADMIN_PORT` (default `8080`), `ADMIN_DEV_PORT` (default `5173`).

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Vite dev server    |
| `npm run build`| Production build   |
| `npm run preview` | Preview build   |
| `npm run docker:up` | `docker compose up --build` |
| `npm run docker:dev` | Dev compose with hot reload |
