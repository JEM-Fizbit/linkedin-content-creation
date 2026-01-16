# LI-Creator

A local Next.js application that uses the Claude Agent SDK to help LinkedIn creators transform rough post ideas into polished, engagement-optimized content.

## Overview

LI-Creator provides an interactive, conversational workflow to generate:
- **Hooks** - 3 engaging hook options to stop the scroll
- **Body Content** - Draft posts (150-300 words) optimized for LinkedIn
- **CTAs** - 3 call-to-action variations to drive engagement
- **Visual Concepts** - Text descriptions and preview mockups for visual content

### Key Features

- **Conversational Ideation** - Chat with Claude to refine your post ideas
- **Structured Output** - Get organized, actionable content sections
- **Inline Editing** - Edit any section with version history
- **Favorites Library** - Save and reuse your best hooks, CTAs, and content
- **Session Management** - Auto-save, search, filter, and revisit past sessions
- **Performance Tracking** - Log engagement metrics for published posts
- **Remix Feature** - Create fresh angles from successful content
- **Export Options** - Copy to clipboard, Markdown, PDF, or PNG
- **Dark/Light Mode** - Comfortable viewing in any environment

## Technology Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, SQLite database
- **AI Engine**: Claude Agent SDK (TypeScript V2 Preview)
- **State Management**: React Context
- **Real-time**: Server-sent events for streaming responses

## Prerequisites

1. **Node.js 18+** installed
2. **Claude running** continuously in a separate terminal window
3. **Claude Agent SDK** configured for local authentication

## Getting Started

### Quick Setup

```bash
# Make the setup script executable (if needed)
chmod +x init.sh

# Run the setup script
./init.sh

# Start the development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Manual Setup

```bash
# Install dependencies
npm install

# Create .env.local (copy from .env.example if available)
cp .env.example .env.local

# Start the development server
npm run dev
```

## Project Structure

```
LI-Creator/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── sessions/      # Session CRUD endpoints
│   │   ├── chat/          # Claude chat endpoints
│   │   ├── favorites/     # Favorites endpoints
│   │   ├── export/        # Export endpoints
│   │   ├── performance/   # Performance tracking endpoints
│   │   └── connection/    # Claude SDK connection status
│   ├── favorites/         # Favorites library page
│   ├── published/         # Published posts page
│   ├── session/           # Session detail page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Dashboard/home page
├── components/            # React components
│   ├── chat/             # Chat interface components
│   ├── output/           # Structured output components
│   ├── layout/           # Layout components (sidebar, nav)
│   └── ui/               # Shared UI components
├── lib/                   # Utilities and configurations
│   ├── db/               # SQLite database setup
│   ├── claude/           # Claude SDK integration
│   └── utils/            # Helper functions
├── contexts/             # React Context providers
├── types/                # TypeScript type definitions
├── data/                 # SQLite database file
├── public/               # Static assets
├── init.sh               # Setup script
└── README.md             # This file
```

## Database Schema

The app uses SQLite with the following tables:

- **sessions** - Content ideation sessions
- **messages** - Chat conversation history
- **outputs** - Generated structured content
- **favorites** - Saved hooks, CTAs, body content, templates
- **performance_notes** - Engagement metrics for published posts

## API Endpoints

### Sessions
- `GET /api/sessions` - List all sessions (with filters)
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/remix` - Create remix

### Chat
- `POST /api/chat` - Send message to Claude (streaming)
- `POST /api/chat/regenerate` - Regenerate specific section

### Favorites
- `GET /api/favorites` - List favorites
- `POST /api/favorites` - Save favorite
- `DELETE /api/favorites/:id` - Delete favorite

### Export
- `POST /api/export/markdown` - Export as Markdown
- `POST /api/export/pdf` - Export as PDF
- `POST /api/export/png` - Export visual as PNG
- `POST /api/export/clipboard` - Get clipboard-ready content

### Performance
- `GET /api/performance/:sessionId` - Get performance notes
- `POST /api/performance/:sessionId` - Save performance notes
- `GET /api/performance/stats` - Aggregate statistics

### Connection
- `GET /api/connection/status` - Check Claude SDK status
- `POST /api/connection/retry` - Retry connection

## Reference Documentation

- [Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [TypeScript SDK](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [TypeScript V2 Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview)

## Design System

### Colors
- **Primary Accent**: LinkedIn Blue (#0A66C2)
- **Light Mode**: White/Light Gray backgrounds, Dark Gray text
- **Dark Mode**: Dark backgrounds (#111827), White text

### Typography
- Font Family: Inter (or system font stack)
- Clear heading hierarchy with semi-bold weights
- Good line height for readability

## Contributing

This is a local-first application designed for single-user use. Future expansions may include multi-user support with authentication.

## License

Private project - All rights reserved.
