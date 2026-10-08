# Smart Study Planner — Implementation Contract

This document is the single source of truth shared by the backend (`server/`) and frontend (`client/`).
Both sides MUST follow it exactly (paths, field names, status codes, response shapes).
All user-facing text is **Uzbek, Latin script** (use the apostrophe `'` consistently, e.g. `bo'lishi`, `o'quvchi`).

## 0. Repository layout

```
/                       repo root (git)
  package.json          root scripts (install:all, dev, build, start, test, seed) — uses `concurrently`
  README.md             Uzbek instructions (setup, env, demo accounts, 12 tests, deploy)
  render.yaml           Render blueprint: one Node web service (server serves built client)
  .gitignore            node_modules, dist, .env, coverage, *.log
  shared/
    planner.js          ALREADY WRITTEN — pure ESM algorithm module (DO NOT change behaviour)
    planner.d.ts        ALREADY WRITTEN — TS types for the frontend
  server/               Node.js + Express (plain JavaScript, ESM, "type": "module")
  client/               React + TypeScript + Vite + Tailwind CSS v3 + Recharts + react-router-dom v6
  docs/CONTRACT.md      this file
```

Toolchain on this machine: Node v24, npm v11, Windows PowerShell 5.1. In every new PowerShell call, refresh PATH first:
`$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')`

## 1. Shared algorithm (`shared/planner.js`)

Exports: `TOPIC_COUNT` (6), `LIMITS`, `REVIEW_DAY_LABEL` ("Takrorlash / dam olish"), `MESSAGES`,
`parseIntegerField`, `isValidDateString`, `addDays`, `sanitizeText`, `maxTopicsPerDay`,
`validatePlanInput(input, {requireMeta})`, `distributeTopics({topics, daysCount, dailyMinutes, startDate})`,
`computeProgress(days)`, `percentOf(completed, total)`.

- `validatePlanInput` returns `{ valid, errors: {field: message}, topicErrors: (string|null)[6], value }`.
  Fields: `title`, `subject`, `daysCount`, `dailyMinutes`, `topics`, `startDate`. `value` holds sanitized, parsed values when valid.
- `distributeTopics` returns `{ days, endDate, totalTopics }`; each day `{ dayNumber, date, type: "study"|"review", totalMinutes, topics: [{ topicId: "t1".."t6", title, minutes, completed:false, completedAt:null }] }`.
- `computeProgress(days)` → `{ total, completed, percent }` with `percent = Math.round(completed/total*100)` (0 when total = 0).
- Backend imports it via relative path, e.g. from `server/src/routes/plans.js`: `import { ... } from "../../../shared/planner.js";`
- Frontend imports it via the Vite/TS alias `@shared/planner` (alias → `../shared`; add `server.fs.allow: [".."]`; tsconfig `paths: {"@shared/*": ["../shared/*"]}`).
- NEVER re-implement distribution / validation / progress logic elsewhere — always call these functions (TZ: "Bajarilish foizi frontend va backendda bir xil hisoblanishi kerak").

## 2. Data model (MongoDB + Mongoose)

### User (collection `users`)
| field | type | notes |
|---|---|---|
| fullName | String, required, trim, max 100 | |
| username | String, required, unique index, lowercase, trim, 3–30 chars `^[a-z0-9_.]+$` | |
| passwordHash | String, required | bcrypt (use `bcryptjs`, cost 10). NEVER returned in JSON |
| role | String enum `student`/`teacher`/`admin`, default `student`, indexed | |
| teacherId | ObjectId ref `User`, default null, indexed | only meaningful for students; must reference a user with role `teacher` |
| timestamps | createdAt / updatedAt | |

### StudyPlan (collection `studyplans`)
| field | type | notes |
|---|---|---|
| userId | ObjectId ref `User`, required, indexed | owner (student) |
| title | String, required | |
| subject | String, required | |
| daysCount | Number (int ≥1) | |
| dailyMinutes | Number (int ≥1) | |
| startDate | String `YYYY-MM-DD` | stored as string to avoid timezone shifts |
| endDate | String `YYYY-MM-DD` | startDate + daysCount − 1 |
| totalTopics | Number | always 6 |
| days | [DaySchema] | `{ dayNumber, date, type: "study"|"review", totalMinutes, topics: [TopicSchema] }` (`_id: false` on subdocs) |
| TopicSchema | | `{ topicId: String, title: String, minutes: Number, completed: Boolean default false, completedAt: Date default null }` |
| timestamps | createdAt / updatedAt | compound index `{ userId: 1, createdAt: -1 }` |

## 3. JSON conventions

- All JSON ids are exposed as `id` (string). No `_id`, no `__v`, no `passwordHash` in any response.
- Dates: `startDate`, `endDate`, `days[].date` are `YYYY-MM-DD` strings; `completedAt`, `createdAt`, `updatedAt` are ISO strings (or `null`).
- **Public user** object: `{ id, fullName, username, role, teacherId: string|null, createdAt }`.
- **Plan** object (full):
```json
{
  "id": "…", "userId": "…", "title": "Matematika imtihoni", "subject": "Matematika",
  "daysCount": 3, "dailyMinutes": 60, "startDate": "2026-10-10", "endDate": "2026-10-12", "totalTopics": 6,
  "days": [ { "dayNumber": 1, "date": "2026-10-10", "type": "study", "totalMinutes": 60,
              "topics": [ { "topicId": "t1", "title": "Mavzu 1", "minutes": 30, "completed": false, "completedAt": null } ] } ],
  "progress": { "total": 6, "completed": 0, "percent": 0 },
  "createdAt": "…", "updatedAt": "…"
}
```
  `progress` is ALWAYS computed server-side with `computeProgress(plan.days)`; it is not stored.
- **Plan summary** (list endpoints): same as plan WITHOUT `days`, plus `progress`.
- **Error** response: `{ "message": "Uzbek human-readable message", "errors"?: { "<field>": "message" } }`.
  Validation errors → 400 with `errors` map (same keys as `validatePlanInput`). Also include `topicErrors` when relevant.

Status codes: 200 OK, 201 created, 400 validation, 401 not authenticated (`"Avval tizimga kiring."` / `"Sessiya muddati tugagan. Qaytadan kiring."`),
403 forbidden (`"Bu amalni bajarish uchun ruxsatingiz yo'q."`), 404 not found (`"Reja topilmadi."` / `"Foydalanuvchi topilmadi."`),
409 conflict (`"Bu foydalanuvchi nomi band."`), 429 too many login attempts, 500 (`"Serverda xatolik yuz berdi. Keyinroq urinib ko'ring."`).
Invalid ObjectId in a path → 404 (never 500).

## 4. REST API (all under `/api`, JSON, auth via `Authorization: Bearer <JWT>`)

JWT: HS256, secret `JWT_SECRET`, payload `{ sub: userId, role }`, expiry `JWT_EXPIRES_IN` (default `7d`).
The auth middleware MUST re-load the user from DB on every request (deleted users / changed roles take effect immediately).

| Method | Path | Role | Body / Query | Response |
|---|---|---|---|---|
| GET | /api/health | public | – | `{ status: "ok" }` |
| POST | /api/auth/login | public (rate-limited 20/15min per IP) | `{ username, password }` | 200 `{ token, user }`; 400 if empty fields (`errors.username` "Foydalanuvchi nomini kiriting.", `errors.password` "Parolni kiriting."); 401 `"Login yoki parol noto'g'ri."` |
| GET | /api/auth/me | any | – | `{ user }` |
| POST | /api/plans/preview | student | `{ title, subject, daysCount, dailyMinutes, startDate, topics: string[6] }` | 200 `{ preview: { title, subject, daysCount, dailyMinutes, startDate, endDate, totalTopics, days, progress } }`; 400 validation |
| POST | /api/plans | student | same as preview + optional `completedTopicIds: string[]` (subset of t1..t6) | 201 `{ plan }` — server re-validates and RE-COMPUTES `days` with `distributeTopics` (never trusts client `days`); topics in `completedTopicIds` saved as completed with `completedAt = now` |
| GET | /api/plans | student | – | `{ plans: PlanSummary[] }` own plans, newest first |
| GET | /api/plans/:id | owner student, the owner's assigned teacher (read-only), admin | – | `{ plan }`; others → 403; missing → 404 |
| PATCH | /api/plans/:id/topics/:topicId | owner student ONLY | `{ completed: boolean }` (must be a real boolean, else 400 `"completed qiymati true yoki false bo'lishi kerak."`) | `{ plan }` (full, with fresh progress). completed:true sets `completedAt = now` (keep existing if already completed); false sets `completedAt = null`. Unknown topicId → 404 `"Mavzu topilmadi."`. Use an atomic update (`findOneAndUpdate` with `arrayFilters`) or load+save; either way respond with the updated doc |
| DELETE | /api/plans/:id | owner student ONLY | – | `{ message: "Reja o'chirildi." }` |
| GET | /api/teacher/students | teacher | – | `{ students: [ { id, fullName, username, plansCount, totalTopics, completedTopics, progress (percent, aggregated over all plans = percentOf(sum completed, sum total)), lastActivityAt: ISO|null } ] }` only students with `teacherId == me` |
| GET | /api/teacher/students/:id/plans | teacher | – | `{ student: PublicUser, plans: Plan[] (full, with progress), activity: [ { date: "YYYY-MM-DD", completed: number } ] (completions per day from completedAt, last 14 days incl. today, oldest→newest), summary: { plansCount, totalTopics, completedTopics, progress } }`; student not assigned to me → 403; not found → 404 |
| GET | /api/admin/statistics | admin | – | `{ users: { total, students, teachers, admins }, plans: { total, completed (percent==100), inProgress }, topics: { total, completed }, averageProgress (mean of plan percents, rounded; 0 if no plans), overallProgress (percentOf(topics.completed, topics.total)), recentActivity: [ { date, completed } ] (last 14 days) }` |
| GET | /api/admin/users | admin | optional `?role=student|teacher|admin` | `{ users: PublicUser[] }` (each student also has `teacherName: string|null`) |
| POST | /api/admin/users | admin | `{ fullName, username, password (min 6), role, teacherId? }` | 201 `{ user }`; 400 validation (errors per field); 409 duplicate username |
| PATCH | /api/admin/users/:id | admin | any of `{ fullName, role, teacherId (null to unassign), password }` | `{ user }`. If role changes away from student → teacherId set null. If a teacher is demoted, unassign their students. Admin cannot change own role. |
| DELETE | /api/admin/users/:id | admin | – | `{ message: "Foydalanuvchi o'chirildi." }`; deletes the user's plans too; teacher deleted → their students' teacherId = null; cannot delete self (400 `"O'zingizni o'chira olmaysiz."`) |

Unknown `/api/*` route → 404 `{ message: "So'ralgan manzil topilmadi." }`. Malformed JSON body → 400 `{ message: "So'rov formati noto'g'ri." }`.

Security middleware: `helmet` (with CSP compatible with the built SPA), `cors` (origin from `CLIENT_ORIGIN`, comma-separated; allow all in development if unset), `express.json({ limit: "100kb" })`,
a sanitizer that removes keys starting with `$` or containing `.` from `req.body`/`req.params` (NoSQL-injection guard; do not reassign `req.query` in Express 5), `mongoose.set("strictQuery", true)` and `sanitizeFilter`,
all string inputs trimmed + `sanitizeText`. Only whitelisted fields are ever read from bodies.

## 5. Server environment (`server/.env.example`, read with `dotenv`)

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/smart-study-planner
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
SEED_DEMO=true
```
In production, if `JWT_SECRET` is missing the server must refuse to start. When `SEED_DEMO=true` and the users collection is empty, seed demo data at startup.
In production (or whenever `client/dist/index.html` exists and `SERVE_CLIENT !== "false"`), Express serves `client/dist` statically with SPA fallback for non-`/api` GET routes.

## 6. Demo data (seed — also `npm run seed` which resets demo users idempotently)

| Rol | Login | Parol | Ism |
|---|---|---|---|
| Administrator | `admin` | `admin123` | Administrator |
| O'qituvchi | `teacher` | `teacher123` | Dilnoza Karimova |
| O'quvchi | `student` | `student123` | Ali Valiyev (teacher: `teacher`) — starts with NO plans |
| O'quvchi | `student2` | `student123` | Madina Rahimova (teacher: `teacher`) — one sample plan "Fizika imtihoni", 3 days × 60 min, 2 of 6 topics completed |

## 7. Frontend (client/) requirements

- Vite + React 18 + TypeScript (strict) + Tailwind CSS v3 (`darkMode: "class"`) + react-router-dom v6 + Recharts 2.
- `VITE_API_URL` (default empty → same origin `/api`); Vite dev server proxies `/api` → `http://localhost:5000`.
- Token stored in `localStorage` key `ssp_token`; theme in `ssp_theme` (`light`/`dark`, default = system preference). Wrap all storage access in try/catch.
- API client: on network failure show `"Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring."`; on 401 clear token and redirect to /login; otherwise show server `message`.
- Routes:
  - `/login` — login page (shows demo accounts hint card).
  - Student: `/` (Student Dashboard: stat cards — rejalar soni, jami mavzular, bajarilgan mavzular, umumiy foiz; Recharts bar chart of progress per plan; recent plans), `/plans/new` (Yangi reja yaratish), `/plans` (Mening rejalarim — list, open, delete with confirm), `/plans/:id` (Reja tafsilotlari).
  - Teacher: `/teacher` (students table/cards with progress bars + Recharts chart), `/teacher/students/:id` (student's plans read-only: same day cards with DISABLED checkboxes, progress, activity chart).
  - Admin: `/admin` (statistics cards + charts; users table with create/edit/delete, role select, teacher assignment).
  - Redirect after login by role: student → `/`, teacher → `/teacher`, admin → `/admin`. Wrong-role access → redirect to own home.
- **New plan page** (`/plans/new`): fields Reja nomi, Imtihon yoki fan nomi, Kunlar soni, Kunlik vaqt (daqiqa), Boshlanish sanasi (default today), 6 topic inputs ("1-mavzu"… placeholders).
  Number inputs use `type="text" inputMode="numeric"` so letters/decimals reach validation and show the error (do not let the browser silently drop them).
  Button **"Reja yaratish"** → client-side `validatePlanInput` (errors shown UNDER each field, red, and the form is not submitted) → `POST /api/plans/preview` → render the schedule (same DayCard components) with working checkboxes (local state), live progress bar + percent ("Jami 6 mavzu / Bajarildi N / Natija P%"), a **"Tiklash"** button (uncheck all) and a **"Rejani saqlash"** button → `POST /api/plans` with `completedTopicIds` → success toast "Reja muvaffaqiyatli saqlandi." → navigate to `/plans/:id`.
  Server 400 errors are mapped back under the fields too.
- **Plan detail page** (`/plans/:id`): header (title, subject, start–end dates formatted in Uzbek e.g. "10-oktabr, 2026"), summary cards (Jami / Bajarildi / Natija %), progress bar, day cards.
  Each day card: "1-kun", date, "60 daqiqa", list of topics with checkbox + title + "30 daq."; review days show "Takrorlash / dam olish" and are visually distinct; completed topics show strike-through and completion time.
  Checkbox toggle → optimistic update + `PATCH /api/plans/:id/topics/:topicId` (auto-save) with a visible saving indicator ("Saqlanmoqda…" → "Barcha o'zgarishlar saqlandi"). On failure: revert or keep as pending, show error toast, and a **"Saqlash"** button retries pending changes. Also a "Rejani o'chirish" button (confirm dialog) for the owner.
- Progress percent shown on screen MUST come from `computeProgress` (shared) applied to the current days state (identical to backend).
- UI: modern, clean, responsive (mobile-first; works at 360px width), Light/Dark mode toggle in the header, loading spinners/skeletons, toast notifications (success/error), accessible labels (`<label htmlFor>`), visible focus states, `aria-live` for progress/saving status.
- Tests: Vitest + @testing-library/react + jsdom for key UI behaviours.
