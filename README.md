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

### Quick Start (Local Dev)

```bash
git clone https://github.com/ChacierW/stay-singletrack.git
cd stay-singletrack
npm install
npm run seed:local   # Generate sample trail data (no database needed)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Full Setup (with Supabase)

For production or working on the data pipeline, you'll need a Supabase project (free tier works):

1. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

2. **Set up database** — Run migrations in Supabase SQL Editor:
   ```bash
   # Run in order:
   # supabase/migrations/001_initial_schema.sql
   # supabase/migrations/002_add_access_column.sql
   # supabase/migrations/002_trail_predictions.sql
   ```

3. **Run ETL pipeline** (one-time setup)
   ```bash
   npm run etl:fetch      # Fetch Colorado trail data from COTREX
   npm run etl:soil       # Enrich with soil drainage data (slow - 1 req/sec)
   npm run etl:elevation  # Enrich with elevation/aspect data
   npm run etl:seed       # Seed the database
   ```

4. **Generate predictions**
   ```bash
   npm run daily          # Fetch weather + generate predictions
   ```

5. **Start the development server**
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
