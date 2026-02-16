# Contributing to Stay Singletrack

Thanks for your interest in contributing! Here's how to get set up locally.

## Local Development (No Supabase Needed)

The app runs fully offline with sample data. No database, no API keys, no environment variables.

### Quick Start

```bash
git clone https://github.com/ChacierW/stay-singletrack.git
cd stay-singletrack
npm install
npm run seed:local   # Generate sample trail data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see 10 sample Colorado trails with realistic conditions.

### Local Seed Script

`npm run seed:local` generates sample data files in `public/data/`:

| File | Contents |
|------|----------|
| `predictions.json` | Full predictions with geometry |
| `predictions-index.json` | Predictions without geometry (fast initial load) |
| `trail-geometries.json` | GeoJSON geometries keyed by cotrex_id |

The sample data includes:
- **10 real Colorado trail locations** (Marshall Mesa, Betasso, Apex, etc.)
- **All condition types** — rideable, muddy, snow, closed
- **Seasonal closures** — date-range and seasonal access restrictions
- **Bike-friendly flags** — mix of bike and hike-only trails
- **Realistic prediction factors** — soil drainage, aspect, elevation

Re-run `npm run seed:local` anytime to regenerate fresh data.

### How It Works

The app loads trail data in two phases:
1. **API route** → queries Supabase (production only)
2. **Static fallback** → loads from `public/data/*.json` files

Without Supabase env vars, the API returns a 503 and the frontend automatically falls back to the static JSON files. You get the full experience — map, filters, trail details — all from local data.

### Production Data

In production, static files are much larger (~15 MB total, ~10,000 trails) and are updated daily by GitHub Actions. The local seed gives you a small representative dataset for development.

### Environment Variables

**Not required for local dev.** If you want to connect to your own Supabase instance:

```bash
cp .env.example .env.local
# Fill in your own Supabase project credentials
```

### What You Can Work On

Everything! All code is open for contributions:

- **Frontend** — UI components, map interactions, filters, mobile experience
- **Styling** — Dark/light theme, responsive design
- **Performance** — Load times, caching, virtualization
- **Accessibility** — Screen readers, keyboard navigation
- **ETL / Data Pipeline** — Improve how we fetch and enrich trail data
- **Prediction Algorithm** — Better condition logic, new data sources
- **Database Schema** — Propose migrations for new features

> **Note:** Running ETL scripts and database migrations against production requires Supabase credentials (maintainer-only). But you can freely edit these files and open PRs — maintainers will test and deploy.

### Submitting Changes

1. Fork the repo
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes
4. Test locally with `npm run dev`
5. Run `npm run build` to verify no build errors
6. Open a PR against `main`

### Code Style

- TypeScript strict mode
- Tailwind CSS for styling
- Next.js App Router conventions
- Components in `src/components/`
- API routes in `src/app/api/`
