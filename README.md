# clofri

Presence-first, ephemeral chat for close friends. Messages fade. If you're not here, you miss it.

## Stack

- **Frontend:** Vite + React + TypeScript + TailwindCSS
- **Backend:** Supabase (Auth, Postgres, Realtime Broadcast + Presence)
- **Deploy:** Vercel (frontend) + Supabase (backend)

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database schema

Open the SQL Editor in your Supabase dashboard and run the contents of `supabase/schema.sql`.

### 3. Enable Auth providers

In Supabase Dashboard → Authentication → Providers:
- Enable **Google** (add OAuth client ID and secret from Google Cloud Console)
- **Email (magic link)** is enabled by default

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase URL and anon key from Dashboard → Settings → API.

### 5. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project Structure

```
src/
├── components/       # React UI components
│   ├── Login.tsx     # Auth page (Google OAuth + magic link)
│   ├── Layout.tsx    # App shell with sidebar navigation
│   ├── Home.tsx      # Groups list with create/join
│   ├── GroupChat.tsx  # Real-time chat room
│   └── Friends.tsx   # Friend management
├── hooks/
│   └── useChat.ts    # Real-time chat hook (Broadcast + Presence)
├── stores/
│   ├── authStore.ts  # Auth state (Zustand)
│   ├── groupStore.ts # Groups CRUD
│   └── friendStore.ts # Friends CRUD
├── lib/
│   └── supabase.ts   # Supabase client
├── types/
│   └── database.ts   # TypeScript types for DB schema
├── App.tsx           # Root with routing + auth guard
└── main.tsx          # Entry point
supabase/
└── schema.sql        # Database schema + RLS policies
```
