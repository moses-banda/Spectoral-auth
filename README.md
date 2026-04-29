# SpecAuth Frontend

React web app for the SpecAuth spectral paint authenticator.
Connects to the ESP32 over Web Bluetooth, stores reference profiles in Supabase,
and generates AI descriptions via Gemini 2.5 Flash.

---

## Architecture

```
┌─────────────┐   BLE    ┌──────────────────┐   HTTPS   ┌──────────────┐
│ XIAO ESP32  │ ───────▶ │  React Frontend  │ ────────▶ │   Supabase   │
│  SpecAuth   │          │  (Vite + Tailwind)│          │  + pgvector  │
└─────────────┘          └──────────────────┘          └──────────────┘
                                   │
                                   │ via Edge Function
                                   ▼
                         ┌──────────────────┐
                         │  Gemini 2.5 Flash │
                         └──────────────────┘
```

Everything except the ESP32 lives in the browser. No traditional backend server —
Supabase + one Edge Function handles storage and AI calls.

---

## One-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, and grab:
- Project URL
- Anon (public) key

Both are on the **Project Settings → API** page.

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your Supabase URL + anon key.

### 4. Create the database schema

In Supabase: **SQL Editor → New query**. Paste the contents of
`supabase/schema.sql` and run it. This creates the `profiles` and
`scans` tables plus the `match_profiles` RPC function.

### 5. Deploy the Gemini Edge Function

You need the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set the Gemini API key (get one free at https://aistudio.google.com/apikey)
supabase secrets set GEMINI_API_KEY=your_gemini_key_here

# Deploy the function
supabase functions deploy describe-paint
```

---

## Running

```bash
npm run dev
```

Opens at `http://localhost:5173`.

**Browser requirement:** Web Bluetooth only works in Chrome, Edge, and Opera on
desktop, or Chrome on Android. **iOS Safari is not supported** — Apple refuses
to ship Web Bluetooth.

---

## File structure

```
src/
├── App.jsx                 Main layout + state orchestration
├── main.jsx                React entry point
│
├── ble/
│   ├── uuids.js            BLE UUIDs (must match firmware)
│   ├── protocol.js         Parse scan payloads, encode profiles
│   └── useBLE.js           React hook: connection lifecycle
│
├── supabase/
│   ├── client.js           Supabase SDK init
│   ├── profiles.js         CRUD + findMatches (pgvector)
│   └── scans.js            Historical scan logging
│
├── ai/
│   └── describe.js         Call Edge Function for descriptions
│
├── components/
│   ├── ConnectButton.jsx   BLE connect/disconnect UI
│   ├── SpectrumChart.jsx   Live 10-channel bar chart
│   ├── VerdictCard.jsx     Pass/fail/uncertain card
│   ├── RegisterModal.jsx   Capture + describe + save new profile
│   ├── MatchResults.jsx    Ranked leaderboard of closest profiles
│   ├── DeltaChart.jsx      Per-channel difference viz
│   ├── ProfileGallery.jsx  Grid of saved reference profiles
│   └── HuntMode.jsx        Warmer/colder live hunt UI
│
└── lib/
    ├── wavelengthColor.js  Channel → true color mapping
    └── cosineSimilarity.js Client-side similarity + delta math

supabase/
├── schema.sql              Database schema (run in SQL editor)
└── functions/
    └── describe-paint/
        └── index.ts        Secure Gemini proxy (deploy via CLI)
```

---

## Feature map

| Feature | Status | Component |
|---|---|---|
| BLE connection | ✅ | `ConnectButton` + `useBLE` |
| Live spectrum chart | ✅ | `SpectrumChart` |
| Pass/fail verdict | ✅ | `VerdictCard` |
| Register reference | ✅ | `RegisterModal` |
| AI descriptions | ✅ | `ai/describe.js` + Edge Function |
| Ranked matches | ✅ | `MatchResults` |
| Delta comparison | ✅ | `DeltaChart` |
| Profile gallery | ✅ | `ProfileGallery` |
| Hunt Mode | ✅ | `HuntMode` |
| Scan history | 🚧 | (logged in DB, UI TBD) |
| Photo upload | 🚧 | (schema ready, UI TBD) |

---

## Author

Moses Bandabilt — Vanderbilt University ECE / CS '28

Part of the ES 3890 Design Discovery project.
