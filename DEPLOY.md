# Safargo — Telegram Mini App

Intercity ride-matching app for Uzbekistan. Built with React, TypeScript, Vite, and Tailwind CSS.

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production
```bash
npm run build
npm run preview
```

## 📦 Deployment to Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Set Environment Variable
Add your Telegram bot token to Vercel:

```bash
vercel env add VITE_TELEGRAM_BOT_TOKEN
# Paste: 8640801891:AAHXlCDrh-pqvUFZxXGBykDUY3VChYWAoO8
```

Or via Vercel Dashboard:
1. Go to your project settings
2. Environment Variables
3. Add `VITE_TELEGRAM_BOT_TOKEN = 8640801891:AAHXlCDrh-pqvUFZxXGBykDUY3VChYWAoO8`

### 3. Deploy
```bash
vercel --prod
```

## ⚙️ Environment Variables

Create `.env.local` in the root:
```
VITE_TELEGRAM_BOT_TOKEN=8640801891:AAHXlCDrh-pqvUFZxXGBykDUY3VChYWAoO8
```

## 📋 Features

### Screen 1: Entry (Kirish)
- GPS location detection with Nominatim
- Manual region/district selection
- Role choice: Driver or Passenger

### Screen 2: Passenger (Yo'lovchi)
- Post ride request with preferences
- View driver applicants
- Rate drivers after completion

### Screen 3: Driver (Haydovchi)  
- Post ride with pricing
- Accept/reject passenger requests
- Smart matching by district

## 🎨 Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 3.4
- Zustand (state management)
- Telegram WebApp SDK
- Lucide React (icons)

## 📱 Bot Info

- **Bot**: @Safargot_bot
- **Token**: `8640801891:AAHXlCDrh-pqvUFZxXGBykDUY3VChYWAoO8`
- **Max Width**: 390px (mobile)
- **Language**: Uzbek

## 🔧 Development

### Available Scripts
- `npm run dev` — Start dev server
- `npm run build` — Build for production (TypeScript check + Vite)
- `npm run preview` — Preview production build

### Code Quality
- TypeScript strict mode (zero `any` types)
- All errors must be 0 before deploy
- No unused imports

## 📂 Project Structure

```
src/
├── screens/           # Main UI screens
│   ├── EntryScreen.tsx
│   ├── PassengerScreen.tsx
│   └── DriverScreen.tsx
├── components/        # Reusable UI components
├── store/            # Zustand state management
├── lib/              # Utils (Telegram SDK, geocoding)
├── data/             # Static data (regions, districts)
├── types/            # TypeScript types
└── utils/            # Formatting helpers
```
