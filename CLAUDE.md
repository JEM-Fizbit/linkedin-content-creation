# LI-Creator

AI-powered content creation agent for LinkedIn, YouTube, and Facebook posts.

**Status:** Development (local only)

---

## Developer Information

**Git Configuration (REQUIRED):**
```bash
git config user.name "JM"
git config user.email "johnemilad@hotmail.com"
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + Lucide Icons |
| Backend | Next.js API Routes |
| Database | SQLite (better-sqlite3) |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Hosting | Local development |

---

## Key Commands

```bash
# Development
npm run dev          # Start dev server on port 3000

# Build
npm run build        # Production build
npm run start        # Start production server

# Lint
npm run lint         # Run ESLint
```

---

## Dev Server Protocol

**After completing code changes, always restart the dev server:**

1. Kill any existing process on port 3000: `lsof -ti :3000 | xargs kill -9 2>/dev/null`
2. Start the dev server in the background: `npm run dev` (from project root, run in background)
3. Confirm it's running by checking the output shows "Ready"

This ensures the user can immediately verify changes without manual restarts.

---

## Architecture

### Prompt System (Layered)

All AI generation uses a layered prompt composition system (`lib/prompts/compose.ts`):

```
baseSystemPrompt → master_voice_prompt → {platform}_tone_prompt → {section}_agent_prompt
```

- **master_voice_prompt**: Universal writing DNA applied to all content
- **{platform}_tone_prompt**: Platform-specific modifier (linkedin, youtube, facebook)
- **{section}_agent_prompt**: Section expert instructions (hooks, body, intros, titles, ctas, thumbnails)

All prompts are stored in the `settings` table and editable via `/settings`.

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/projects` | CRUD for projects |
| `/api/chat` | Conversational AI (uses composed prompts) |
| `/api/outputs` | Generate all sections for a project |
| `/api/regenerate` | Regenerate a specific section |
| `/api/assistant` | AI assistant for editing |
| `/api/settings` | GET/PATCH/POST(reset) for prompt settings |

### Database

SQLite database at `data/app.db`. Schema defined in `lib/db/index.ts` with auto-migrations.

Key tables: `projects`, `outputs`, `settings`, `messages`, `favorites`, `generated_images`, `research_results`
