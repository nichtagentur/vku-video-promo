# VKU Video Promo Generator

Web app that scrapes upcoming events from kommunaldigital.de, generates AI video scripts, and composites animated promo videos in-browser.

## Tech Stack
- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS v4
- Cheerio (server-side scraping)
- Claude API (script generation)
- OpenAI GPT Image (background images)
- HTML5 Canvas + MediaRecorder (video rendering)
- ffmpeg.wasm (MP4 conversion)

## Key Commands
```bash
npm run dev    # Development server
npm run build  # Production build
```

## Environment Variables
- `CLAUDE_API_KEY_1` - Anthropic API key for script generation
- `OPENAI_API_KEY` - OpenAI API key for image generation

## Architecture
- `/api/scrape` - Cheerio event scraper
- `/api/generate-script` - Claude script generation
- `/api/generate-image` - OpenAI image generation
- `/editor/[eventId]` - Video editor workspace
- `src/lib/canvas-engine.ts` - Core video rendering
- `src/lib/recorder.ts` - MediaRecorder + ffmpeg.wasm
