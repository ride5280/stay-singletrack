# 🚵 Stay Singletrack

**AI-powered trail condition predictions for Colorado mountain bikers.**

Know if trails are rideable before you drive. No crowdsourcing required.

![Stay Singletrack](https://img.shields.io/badge/Cost-$0%2Fmonth-green) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🎯 What It Does

Stay Singletrack predicts trail conditions using:
- **COTREX** trail data (40,000+ miles of Colorado trails)
- **USDA SSURGO** soil drainage classifications
- **USGS** elevation and aspect data
- **Open-Meteo** weather data (free, no API key needed)

The app combines soil drainage rates with recent precipitation, temperature, and trail aspect to estimate when trails will be dry and rideable.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   COTREX    │     │   SSURGO    │     │  USGS DEM   │       │
│  │  (trails)   │     │   (soil)    │     │ (elevation) │       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘       │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                    │
│                   ┌─────────────────┐                           │
│                   │  ONE-TIME ETL   │  ← Run once, store forever│
│                   └────────┬────────┘                           │
│                            ▼                                     │
│                   ┌─────────────────┐                           │
│                   │    Supabase     │  ← Free tier              │
│                   └────────┬────────┘                           │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │   Vercel    │   │GitHub Action│   │  Open-Meteo │          │
│  │  (frontend) │   │(daily cron) │   │  (weather)  │          │
│  └─────────────┘   └──────┬──────┘   └─────────────┘          │
│         ▲                 │                                     │
│         │                 ▼                                     │
│         │        ┌─────────────────┐                           │
│         │        │ predictions.json│  ← Static, CDN-cached     │
│         │        └────────┬────────┘                           │
│         └─────────────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**"Walk Away" Design:** Once set up, the app runs indefinitely on free tiers with zero maintenance.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- A Supabase project (free tier works)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ChacierW/stay-singletrack.git
   cd stay-singletrack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Set up database**
   
   Run the migration in Supabase SQL Editor:
   ```bash
   cat supabase/migrations/001_initial_schema.sql
   # Copy and paste into Supabase SQL Editor
   ```

5. **Run ETL pipeline** (one-time setup)
   ```bash
   # Fetch Colorado trail data from COTREX
   npx tsx scripts/etl/fetch-cotrex.ts
   
   # Enrich with soil drainage data (takes a while - 1 req/sec)
   npx tsx scripts/etl/enrich-soil.ts
   
   # Enrich with elevation/aspect data
   npx tsx scripts/etl/enrich-elevation.ts
   
   # Seed the database
   npx tsx scripts/etl/seed-database.ts
   ```

6. **Generate initial predictions**
   ```bash
   npx tsx scripts/daily/fetch-weather.ts
   npx tsx scripts/daily/generate-predictions.ts
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 📊 Data Sources

| Source | What | Free? | Update Frequency |
|--------|------|-------|------------------|
| [COTREX](https://geodata.colorado.gov/datasets/CPW::cotrex-trails) | Trail geometry & metadata | ✅ | One-time |
| [USDA SSURGO](https://sdmdataaccess.nrcs.usda.gov/) | Soil drainage classification | ✅ | One-time |
| [USGS Elevation](https://epqs.nationalmap.gov/v1/) | Elevation & aspect | ✅ | One-time |
| [Open-Meteo](https://open-meteo.com/) | Weather data | ✅ | Daily |

## 🧮 How Predictions Work

```
Base Dry Time (from soil type)
  × Aspect Modifier (south-facing = faster)
  × Elevation Modifier (high elevation = slower)
  × Temperature Modifier (warmer = faster)
  = Effective Dry Time

If hours_since_rain > effective_dry_time × 1.5 → Rideable 🟢
If hours_since_rain > effective_dry_time       → Likely Rideable 🟡
If hours_since_rain > effective_dry_time × 0.5 → Likely Muddy 🟠
Otherwise                                       → Muddy 🔴
```

### Soil Drainage Classes → Base Dry Hours

| Drainage Class | Base Dry Time |
|----------------|---------------|
| Excessively drained | 6 hours |
| Well drained | 24 hours |
| Moderately well drained | 48 hours |
| Somewhat poorly drained | 72 hours |
| Poorly drained | 120 hours |
| Very poorly drained | 168 hours |

## 🌐 Deployment

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### GitHub Actions

Add these secrets to your repository:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for daily updates)

The workflow runs daily at 6am Mountain Time to update predictions.

## 💰 Cost Breakdown

| Service | Free Tier | Expected Usage | Monthly Cost |
|---------|-----------|----------------|--------------|
| Vercel | 100GB bandwidth | ~1GB | **$0** |
| Supabase | 500MB database | ~50MB | **$0** |
| GitHub Actions | 2,000 min/month | ~30 min | **$0** |
| Open-Meteo | 10,000 req/day | ~10/day | **$0** |
| **Total** | | | **$0** |

## 🛠️ Project Structure

```
stay-singletrack/
├── src/ 
│   ├── app/                 # Next.js pages
│   │   ├── page.tsx         # Map view
│   │   ├── trail/[id]/      # Trail detail
│   │   └── api/report/      # Condition reporting API
│   ├── components/          # React components
│   └── lib/                 # Utilities & types
├── scripts/
│   ├── etl/                 # One-time data enrichment
│   └── daily/               # Daily prediction scripts
├── public/data/
│   └── predictions.json     # Static predictions (updated daily)
└── supabase/migrations/     # Database schema
```

## 🤝 Contributing

Contributions welcome! Some ideas:
- Improve the prediction algorithm
- Add more Colorado regions
- Build a mobile app wrapper
- Add Strava integration
- Support other states with trail data

## 📜 License

MIT License - do whatever you want with it.

## 🙏 Acknowledgments

- **Colorado Parks & Wildlife** for COTREX trail data
- **USDA** for SSURGO soil data
- **USGS** for elevation data
- **Open-Meteo** for free weather API
- The Colorado MTB community for inspiration

---

Built with ☕ and 🚵 in Colorado.

*Stay on trail. Respect closures. Don't ride muddy trails.*
