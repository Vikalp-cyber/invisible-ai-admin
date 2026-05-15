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

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Vite dev server    |
| `npm run build`| Production build   |
| `npm run preview` | Preview build   |
