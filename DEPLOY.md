# Safargo — Telegram Mini App

Intercity ride-matching app for Uzbekistan. Built with React, TypeScript, Vite, Tailwind CSS, Zustand, Telegram Mini App SDK, and Supabase.

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not put `TELEGRAM_BOT_TOKEN` in any `VITE_*` variable. Vite frontend variables are public in the browser bundle.

## Production Build

```bash
npm run build
npm run preview
```

## Supabase Notifications

Apply the notification migration in Supabase SQL Editor:

```sql
alter table public.users
  add column if not exists telegram_chat_id text;

alter table public.driver_profiles
  add column if not exists phone text;
```

The full migration is in `supabase/migrations/20260511000000_add_telegram_notifications.sql`.

Install and link Supabase CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref gyzhblctmqmqwxaokoss
```

Set Edge Function secrets:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=your_new_bot_token
supabase secrets set TELEGRAM_MINI_APP_URL=https://your-vercel-domain.vercel.app
```

Deploy functions:

```bash
supabase functions deploy notify-passenger
supabase functions deploy notify-drivers
```

Local function testing:

```bash
supabase functions serve
```

## Notification Flow

- Passenger creates a request in the Mini App.
- Frontend inserts `passenger_requests`, then invokes `notify-drivers`.
- `notify-drivers` finds drivers in the same district and sends each one a Telegram message through the bot.
- Driver taps `Qabul qilish`.
- Frontend updates `passenger_requests.status` and `selected_driver_id`, then invokes `notify-passenger`.
- `notify-passenger` sends the selected driver details to the passenger.

## Vercel Deployment

Set only public frontend variables in Vercel:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

Bot token storage belongs only in Supabase Edge Function secrets.
