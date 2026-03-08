# AskHank

An AI that talks you out of buying things. User describes a purchase, Hank (the AI personality) challenges them through conversation, scores their arguments, and holds firm unless they make a genuinely strong case. ~10-15% concession rate.

## Stack
- **Frontend:** Next.js (Vercel), TypeScript, Tailwind, Framer Motion
- **Backend:** Convex (auth, database, scoring engine, LLM proxy)
- **AI:** Claude Haiku / GPT-4o-mini (cheap, short conversations)
- **Payments:** Stripe (credit packs, not subscriptions)

## Key Docs
- `docs/hank-spec.md` — product spec, voice rules, personality
- `docs/hank-implementation-plan.md` — phased build plan, architecture
- `docs/hank-scoring-engine.md` — scoring factors, stance logic
- `docs/style-guide.html` — design tokens

## CRITICAL: Git Commits

**Never commit or push without being asked.** When the user says "commit" or "push", do it. When they don't, don't.

- User says "commit this" → commit it (no extra confirmation needed)
- User says "push" → push it
- User didn't ask → **never** commit or push on your own initiative
- Don't add the "Made with Claude" disclaimer or co-author line.

## Dev Server

**Never start the dev server.** The user runs it themselves.

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

## Conventions
- **Components**: PascalCase (`ChatScreen.tsx`, `HistoryList.tsx`)
- **Convex functions**: camelCase files, named exports (`conversations.ts` → `export const send = mutation(...)`)
- **Design system**: See `docs/style-guide.html` for tokens

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.