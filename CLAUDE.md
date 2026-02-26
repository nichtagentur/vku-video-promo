# Event Video Promo Generator

Web app that scrapes upcoming events, generates AI video scripts, and composites animated promo videos -- with a fully automated Instagram publishing pipeline.

## Tech Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Cheerio (server-side scraping)
- Claude API (script generation + fact-checking)
- OpenAI GPT Image (background images)
- Google Veo (background video generation)
- HTML5 Canvas + Puppeteer (headless video rendering)
- ffmpeg (MP4 encoding)

## Key Commands
```bash
npm run dev           # Development server
npm run build         # Production build
npm run automate      # Run automation pipeline
npm run automate:dry  # Dry run (no publishing)
```

## Automation Pipeline
```bash
npx tsx scripts/run-pipeline.ts --dry-run       # Full pipeline, no publish
npx tsx scripts/run-pipeline.ts --list-events   # Show scraped events
npx tsx scripts/run-pipeline.ts --list-schedule # Show today's schedule
npx tsx scripts/run-pipeline.ts --post-one      # Process + publish one event
npx tsx scripts/run-pipeline.ts --skip-render   # Skip video rendering
npx tsx scripts/run-pipeline.ts --event <id>    # Process specific event
```

## Environment Variables
- `CLAUDE_API_KEY_1` - Anthropic API key for script generation
- `OPENAI_API_KEY` - OpenAI API key for image generation
- `GEMINI_API_KEY` - Google API key for Veo video generation
- `META_ACCESS_TOKEN` - Meta Graph API token (Instagram publishing)
- `INSTAGRAM_ACCOUNT_ID` - Instagram Business Account ID

## Architecture

### Web App
- `/api/scrape` - Cheerio event scraper
- `/api/generate-script` - Claude script generation
- `/api/generate-image` - OpenAI image generation
- `/api/generate-video` - Google Veo video generation
- `/editor/[eventId]` - Video editor workspace
- `src/lib/canvas-engine.ts` - Core canvas rendering engine

### Automation (`src/automation/`)
- `pipeline.ts` - Main orchestrator
- `scheduler.ts` - Timing logic (awareness/reminder/urgency phases)
- `fact-checker.ts` - Scrapes event page + Claude verification (hard gate)
- `caption.ts` - Instagram-optimized caption generator
- `headless-render.ts` - Puppeteer frame capture + ffmpeg encoding
- `instagram.ts` - Meta Graph API client
- `state.ts` - Deduplication tracking
- `logger.ts` - File-based logging

### Systemd Timer
Daily automation at 7:30 CET via `~/.config/systemd/user/vku-instagram.timer`

## Workshop Context
Built during an AI Workshop (Feb 2026) as a demonstration of AI-powered content automation.
