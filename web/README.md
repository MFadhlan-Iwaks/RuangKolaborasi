# RuangKolaborasi Web

Next.js web client for RuangKolaborasi.

## Setup

Install dependencies:

```bash
npm install
```

Create `web/.env.local` from `web/.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The base URL redirects to `/login` when there is no active Supabase session, and to `/workspace` when the user is already logged in.

## Local Integration

Run the Express backend in another terminal:

```bash
cd ../backend
npm run dev
```

Backend API:

```text
http://localhost:5000
```
