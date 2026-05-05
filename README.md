# Kanban Task Board

A polished, full-stack Kanban task board built with **React + TypeScript + Vite**
on top of **Supabase** (anonymous auth + Postgres with Row-Level Security).
Tasks can be dragged across the four columns — *To Do*, *In Progress*, *In Review*,
*Done* — and the board supports comments, an activity log, labels, due-date
indicators, team-member assignees, search, filtering, and a board summary.

> Submitted for the Next Play Games — Software Development internship assessment.

---

## Live demo

> _Replace with your deploy URL after running through the deploy steps below._

- **Live app:** `https://your-app.vercel.app`
- **Repo:** `https://github.com/your-username/task-board`

---

## Tech stack

| Layer            | Choice                                          |
| ---------------- | ----------------------------------------------- |
| UI framework     | React 19 + TypeScript                           |
| Build tool       | Vite 8                                          |
| Drag & drop      | `@dnd-kit/core` + `@dnd-kit/sortable`           |
| Date handling    | `date-fns`                                      |
| Database & auth  | Supabase (Postgres, Auth, Realtime)             |
| Styling          | Hand-written CSS with a token system + dark mode |

There is **no custom backend service** — the React frontend talks directly to
Supabase using the public anon key with RLS policies enforcing per-user access.

---

## Features

### Required
- [x] Kanban board with columns **To Do**, **In Progress**, **In Review**, **Done**
- [x] Drag-and-drop between columns to update status (with optimistic updates)
- [x] Create tasks with title, description, priority, due date
- [x] Persistence in Supabase with **RLS** so users only see their own tasks
- [x] **Anonymous guest accounts** via Supabase Auth — no email/password
- [x] Loading skeletons, empty states, and surfaced error toasts

### Advanced (built to differentiate)
- [x] **Team members & assignees** — create a personal "team" with names and
      colored avatars; assign one team member per task; avatars appear on cards
- [x] **Task comments** — open the slide-over detail panel to read and post
      comments; stored in a separate `comments` table
- [x] **Activity log** — every status / title / description / priority /
      due-date / assignee change is recorded in an `activity` table and shown
      as a timeline in the detail panel ("Moved from To Do → In Progress · 2h ago")
- [x] **Labels / tags** — create custom labels with colors, assign multiple to
      a task, and filter the board by label
- [x] **Due-date indicators** — cards show "Due today", "Due in 3d", or
      "2d overdue" with color-coded urgency (overdue is red, soon is amber)
- [x] **Search & filtering** — search by title/description, filter by priority,
      assignee, or labels
- [x] **Board summary / stats** — total / done / overdue counts in the header
- [x] **Real-time updates** — Supabase realtime subscriptions reconcile
      changes from any connected session
- [x] **Responsive** — board collapses to 2 columns on tablets and a single
      column on mobile; sticky header; touch-friendly drag handles
- [x] **Light + dark mode** — fully themed via CSS variables and
      `prefers-color-scheme`
- [x] **Accessible** — keyboard-navigable drag-and-drop (via dnd-kit's keyboard
      sensor), ARIA labels on all interactive elements, focus rings, and
      `prefers-reduced-motion` support

---

## Setup

### 1. Create a Supabase project

1. Go to <https://supabase.com> and create a new free-tier project.
2. In **Authentication → Providers → Anonymous Sign-Ins**, enable
   **"Allow anonymous sign-ins"**.
3. Open the **SQL editor**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   all the tables, indexes, the `updated_at` trigger, RLS policies, and adds
   the tables to the realtime publication.

### 2. Configure the frontend

```bash
# from task-board/
cp .env.example .env
```

Edit `.env` and fill in:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your public anon key from Settings → API>
```

> **Never commit your service role key.** Only the public **anon** key is used
> in the frontend. RLS does the rest of the work.

### 3. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. On first launch, the app calls
`supabase.auth.signInAnonymously()` and the resulting guest UUID is shown in
the header. Every row you create is automatically scoped to that UUID via RLS.

### 4. Test multi-user isolation

- Open the app in a regular window — create tasks A, B, C.
- Open it in an **incognito window** — you'll get a brand-new guest user
  and an empty board. Create tasks X, Y, Z. The two boards never see each
  other's data, enforced both at the API level (the queries filter by
  `user_id`) and at the database level (RLS policies). Try clearing
  `localStorage` to start a fresh guest session.

### 5. Build & deploy

```bash
npm run build        # type-checks + bundles into ./dist
npm run preview      # serves ./dist for a smoke test
```

The output of `npm run build` is a static site you can deploy to any of:

- **Vercel** — `vercel deploy` (set the root directory to `task-board/` and
  add the two `VITE_SUPABASE_*` env vars)
- **Netlify** — same idea, build command `npm run build`, publish `dist/`
- **Cloudflare Pages** — build command `npm run build`, output `dist/`

In Supabase, add your deployed origin to **Authentication → URL Configuration
→ Site URL** so anonymous tokens are returned with the right CORS origin.

---

## Database schema

See [`supabase/schema.sql`](./supabase/schema.sql) for the full DDL. Summary:

| Table          | Key columns                                                                                                              | Notes                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `tasks`        | `id`, `user_id`, `title`, `description`, `status`, `priority`, `due_date`, `assignee_id`, `position`, `created_at`, `updated_at` | `status` and `priority` are CHECK-constrained    |
| `team_members` | `id`, `user_id`, `name`, `color`, `created_at`                                                                           | A user's personal "team"                         |
| `labels`       | `id`, `user_id`, `name`, `color`, `created_at`                                                                           | Unique per user, case-insensitive                |
| `task_labels`  | `(task_id, label_id, user_id)`                                                                                           | Many-to-many join                                |
| `comments`     | `id`, `task_id`, `user_id`, `body`, `created_at`                                                                         |                                                  |
| `activity`     | `id`, `task_id`, `user_id`, `kind`, `from_value`, `to_value`, `created_at`                                               | Append-only event log for the activity timeline  |

**RLS policies** (applied to every table): `select`, `insert`, `update`, and
`delete` are each gated on `auth.uid() = user_id`. Because every row carries a
`user_id`, the policies are simple and uniform.

`tasks.position` is a `double precision` field. When dragging a card to a new
slot we compute `(neighbor_before.position + neighbor_after.position) / 2`,
which lets us reorder without rewriting all sibling rows.

---

## Project structure

```
task-board/
├── supabase/
│   └── schema.sql              # full DDL: tables, indexes, RLS, realtime
├── public/
│   └── favicon.svg
├── src/
│   ├── App.tsx                 # top-level state, modals, panels
│   ├── main.tsx                # React entry
│   ├── index.css               # design tokens + all component styles
│   ├── lib/
│   │   ├── supabase.ts         # supabase-js client
│   │   ├── types.ts            # domain types + status/priority labels
│   │   └── db.ts               # typed CRUD helpers used by the UI
│   ├── hooks/
│   │   ├── useAuth.ts          # anonymous bootstrap
│   │   ├── useBoardData.ts     # tasks/members/labels + realtime
│   │   ├── ToastProvider.tsx   # toast surface
│   │   ├── useToast.ts         # consumer hook
│   │   └── toastContext.ts
│   └── components/
│       ├── Board.tsx           # DnD orchestration + columns
│       ├── Column.tsx          # droppable column
│       ├── TaskCard.tsx        # sortable card
│       ├── Header.tsx          # brand, summary, search, actions
│       ├── FilterRow.tsx       # priority/assignee/label filters
│       ├── Modal.tsx           # reusable modal shell
│       ├── NewTaskModal.tsx    # create-task form
│       ├── TeamModal.tsx       # manage team members + labels
│       ├── TaskDetailPanel.tsx # slide-over with edit, comments, activity
│       ├── Avatar.tsx
│       ├── Pills.tsx           # priority / due-date / label pills
│       └── Icons.tsx           # tiny inline SVG icon set
├── index.html
├── vite.config.ts
├── tsconfig.app.json
├── eslint.config.js
└── package.json
```

---

## Design decisions & trade-offs

**Direct-to-Supabase, no custom backend.** RLS policies are simple, uniform,
and enforce isolation at the database. Adding a Go service would have meant
recreating the same auth/access logic at a second tier without functional gain.

**Hand-written CSS over Tailwind / a UI library.** The brief weighted design
heavily, and a small token-driven CSS file (≈22 KB) gives full control over
spacing, color, and motion without locking the project to a framework's
visual identity. Dark mode falls out of the variable-based tokens
automatically. There's room to extract these tokens into a shared `theme.ts`
or migrate to CSS-in-JS / Tailwind in future without rewriting the components.

**`@dnd-kit` over `react-beautiful-dnd`.** dnd-kit is actively maintained,
has a keyboard sensor for accessibility, and integrates cleanly with React
18/19. Its activation-distance constraint solves the classic "drag vs click"
problem so a click on a card opens the detail panel while a small drag
starts a move.

**Position is a fractional number, not an integer index.** Stores
`(prev + next) / 2` on drop, so reordering touches only the dragged row.
With ~10⁻¹⁵ precision in `double precision` we won't run out of slots in
practice, and the realtime broadcast is one row instead of N.

**Activity log as an append-only side table.** Easier to reason about than
audit triggers, and lets the UI replay it as a timeline. Trade-off: the
write path makes a second insert per change. For this scale that's fine.

**Realtime via Postgres Changes.** Subscribed channels filter by
`user_id=eq.<id>` and trigger a small refetch on any change. Simpler and
more correct than reconciling discrete events, at the cost of one round-trip
per mutation.

---

## What I would improve with more time

- **Bulk position updates** when many tasks need re-balancing (currently relies
  on the fractional-position trick to avoid this; it works but a periodic
  rebalance job would be ideal).
- **Email/password sign-in or "claim guest account"** so a user can keep their
  data across devices. The current `anon` token persists in `localStorage`
  per browser only.
- **Code-splitting** the detail panel + modal bundles. Today everything ships
  in a single ~501 KB / 143 KB gzip bundle. Lazy-loading the panel would shave
  the initial download by ~30%.
- **Generated DB types** via `supabase gen types typescript`. I'm using
  hand-written types today (cleaner for a 6-table schema) but generation
  would scale better.
- **Optimistic comment + activity inserts** for snappier feel on slow networks.
- **Tests:** a Playwright happy-path (create / drag / delete) and a Vitest
  unit suite for the position-computation logic in `Board.tsx`.

---

## Scripts

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR        |
| `npm run build`   | Type-check + produce a production bundle  |
| `npm run preview` | Serve the production bundle locally       |
| `npm run lint`    | Run ESLint on the project                 |

---

## License

Built for assessment purposes only. Not for distribution.
