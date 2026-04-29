# Lumen — Spectral Memory Aid

A handheld spectral identifier that helps people with dementia recognize objects in their environment through voice. Built with a 10-channel AS7341 spectral sensor, Web Bluetooth, and AI.

## How It Works

### For Caregivers: Enroll Objects
1. Tap the microphone → speak: *"This is grandpa's blue coffee mug"*
2. Hold the device near the object → scan 3 times
3. AI extracts name, owner, and a warm description
4. Saved to the database with a spectral fingerprint

### For Patients: Identify Objects  
1. Point the device at any enrolled object
2. Press the scan button
3. Lumen speaks aloud: *"This is grandpa's blue coffee mug. He uses it every morning."*

## Tech Stack

| Layer      | Technology                                      |
|------------|------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS 3, Framer Motion |
| Database   | Supabase (PostgreSQL + pgvector)               |
| Hardware   | XIAO ESP32-S3 + AS7341 + BH1750 via Web BLE   |
| Voice In   | Web Speech Recognition API (Chrome built-in)   |
| Voice Out  | Web Speech Synthesis API (all browsers)        |
| AI         | Gemini 2.0 Flash (via Supabase Edge Function)  |
| Matching   | kNN over pgvector cosine similarity            |

## Pages

| Route       | Purpose                              | User      |
|-------------|--------------------------------------|-----------|
| `/`         | Dashboard + quick actions            | Caregiver |
| `/enroll`   | 3-step enrollment wizard with voice  | Caregiver |
| `/identify` | Patient kiosk mode (dark, huge UI)   | Patient   |
| `/library`  | Browse, search, edit, delete objects | Caregiver |
| `/capture`  | CNN training data collection         | Developer |

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit with your Supabase URL + anon key

# Run the schema migration
# Copy supabase/schema.sql → Supabase SQL Editor → Run

# Start dev server
npm run dev
```

### Optional: Deploy AI Edge Function
```bash
supabase login
supabase link --project-ref YOUR_REF
supabase secrets set GEMINI_API_KEY=AIza...
supabase functions deploy enroll-object
```

Without the Edge Function, enrollment falls back to local transcript parsing.

## Project Structure

```
src/
├── App.jsx                    ← Router + BLE state
├── main.jsx                   ← React entry point
├── pages/
│   ├── HomePage.jsx           ← Dashboard
│   ├── EnrollPage.jsx         ← 3-step enrollment wizard
│   ├── IdentifyPage.jsx       ← Patient kiosk mode
│   └── LibraryPage.jsx        ← Object management
├── components/
│   ├── CapturePage.jsx        ← CNN data collection (legacy)
│   ├── ConnectButton.jsx
│   ├── SpectrumChart.jsx
│   └── ...
├── ble/
│   ├── useBLE.js              ← Web Bluetooth hook
│   ├── protocol.js            ← BLE packet parser
│   └── uuids.js               ← Service/characteristic UUIDs
├── supabase/
│   ├── client.js              ← Supabase client
│   ├── objects.js             ← Object CRUD + identification
│   ├── scans.js               ← Legacy scan history
│   └── dataset.js             ← CNN training data
├── hooks/
│   ├── useSpeechRecognition.js ← Voice input
│   └── useSpeechSynthesis.js   ← Voice output
├── ai/
│   └── enroll.js              ← Gemini metadata extraction
├── lib/
│   ├── cosineSimilarity.js    ← Client-side similarity
│   └── wavelengthColor.js     ← Channel→color mapping
└── styles/
    └── index.css              ← Tailwind + Lumen theme
```

## The Vision

**Dementia Assistance:** Tag everyday objects once, recognize them forever. Voice in, voice out — no screens needed for the patient.

**Robotic Perception:** Same spectral fingerprinting gives robots material-level sensing that cameras can't provide. A robot with Lumen can distinguish a real apple from a plastic one.

Same technology, two applications. Build once, pitch twice.
