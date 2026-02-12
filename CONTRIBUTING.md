# Contributing to Stay Singletrack

Thanks for your interest in contributing! Here's how to get set up locally.

## Local Development (No Supabase Needed)

The app ships with static data files so you can run everything locally without any database or API keys.

### Quick Start

```bash
git clone https://github.com/ChacierW/stay-singletrack.git
cd stay-singletrack
npm install
npm run dev
```

That's it. Open [http://localhost:3000](http://localhost:3000).

### How It Works

The app loads trail data in two phases:
1. **API route** → queries Supabase (production only)
2. **Static fallback** → loads from `public/data/*.json` files

Without Supabase env vars, the API returns a 503 and the frontend automatically falls back to the static JSON files. You get the full experience — map, filters, trail details — all from local data.

### Static Data Files

| File | Size | Contents |
|------|------|----------|
| `public/data/predictions-index.json` | ~3.6 MB | Trail predictions without geometry |
| `public/data/trail-geometries.json` | ~12 MB | GeoJSON geometries keyed by cotrex_id |

These are checked into git and periodically updated by maintainers.

### Environment Variables

**Not required for local dev.** If you want to connect to your own Supabase instance:

```bash
cp .env.example .env.local
# Fill in your own Supabase project credentials
```

### What You Can Work On

- **Frontend** — UI components, map interactions, filters, mobile experience
- **Styling** — Dark/light theme, responsive design
- **Performance** — Load times, caching, virtualization
- **Accessibility** — Screen readers, keyboard navigation

### What Requires Maintainer Access

- ETL scripts (data pipeline)
- Prediction algorithm changes
- Database schema changes
- Deployment and infrastructure

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
