# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies and initialize database
npm run setup

# Development
npm run dev          # Next.js dev server with Turbopack
npm run build        # Production build
npm run start        # Production server

# Testing
npm test             # Run all tests with Vitest
npx vitest run src/path/to/file.test.tsx  # Run a single test file

# Linting
npm run lint

# Database
npm run db:reset     # Reset SQLite database
npx prisma studio    # Open Prisma Studio (DB GUI)
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev  # Apply schema migrations
```

Environment: copy `.env` and add `ANTHROPIC_API_KEY`. Without it, the app uses a `MockLanguageModel` that returns static demo components.

## Architecture

UIGen is an AI-powered React component generator. Users describe a component in chat; Claude generates code via tool calls; the result renders in a live preview iframe — all without writing to disk.

### Request Flow

1. **Chat** (`ChatInterface`) → POST `/api/chat`
2. **API route** (`src/app/api/chat/route.ts`) calls Claude (`claude-haiku-4-5`) with two tools: `str_replace_editor` and `file_manager`
3. Streaming tool calls are forwarded to the client via Vercel AI SDK
4. **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`) intercepts tool call results and mutates the virtual file system
5. Virtual FS changes trigger **PreviewFrame** (`src/components/preview/PreviewFrame.tsx`) to rebuild the iframe
6. The **JSX transformer** (`src/lib/transform/jsx-transformer.ts`) uses Babel standalone to compile JSX, resolves imports via `esm.sh` CDN, and generates blob URLs for each file
7. If authenticated, the project (messages + file system state) is serialized and saved to SQLite via Prisma

### State Management

Two React contexts carry all application state:

- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — wraps `useChat` from the AI SDK; owns messages, streaming state, and anonymous-work tracking
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — owns the virtual file system; exposes file CRUD operations and processes tool calls from the AI

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory Map-based tree. Files never touch disk. It serializes to/from JSON for API round-trips and database storage.

Tool schemas live in `src/lib/tools/`:
- **`str-replace.ts`** — view, create, str_replace, insert, undo_edit
- **`file-manager.ts`** — rename, delete

### AI Provider

`src/lib/provider.ts` exports the language model. It uses `claude-haiku-4-5` via `@ai-sdk/anthropic`. If `ANTHROPIC_API_KEY` is absent, a `MockLanguageModel` runs instead, replaying a static sequence of tool calls that produce demo components (Counter, Form, Card).

### Authentication

JWT sessions via `jose` with 7-day expiration stored in HTTP-only cookies. Server actions in `src/actions/index.ts` handle sign-up, sign-in, sign-out, and project CRUD. Passwords hashed with `bcrypt`.

### Database

Prisma + SQLite. Schema in `prisma/schema.prisma`. Two models: `User` and `Project`. `Project.messages` and `Project.data` are JSON strings storing the full chat history and serialized file system respectively.

### Key Directories

| Path | Purpose |
|---|---|
| `src/app/api/chat/` | Streaming chat API endpoint |
| `src/app/[projectId]/` | Per-project route (auth-protected) |
| `src/lib/contexts/` | ChatContext and FileSystemContext |
| `src/lib/transform/` | JSX → JS compilation + preview HTML generation |
| `src/lib/tools/` | Zod-validated tool schemas for Claude |
| `src/components/preview/` | iframe-based live preview |
| `src/components/chat/` | Chat UI components |
| `src/components/editor/` | Monaco code editor + file tree |

### UI

Built with shadcn/ui (new-york style) on Radix UI primitives, Tailwind CSS v4, and Lucide icons. The main layout uses `react-resizable-panels`: left panel (35%) is chat, right panel (65%) switches between Preview and Code tabs.
