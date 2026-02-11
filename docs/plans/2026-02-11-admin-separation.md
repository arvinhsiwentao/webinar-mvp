# Admin/Public Route Separation Design

**Date:** 2026-02-11
**Status:** Approved
**Approach:** Next.js Route Groups with API namespace split

## Goal

Decouple admin portal from user-facing app for security, UX clarity, and development velocity — without changing any URLs or breaking existing functionality.

## File Structure

### Before

```
src/app/
  layout.tsx
  globals.css
  page.tsx
  demo/page.tsx
  admin/page.tsx
  webinar/[id]/
    page.tsx, confirm/, waiting/, live/, end/
  api/
    webinar/route.ts          (GET/POST)
    webinar/[id]/route.ts     (GET/PUT/DELETE)
    webinar/[id]/chat/        (GET/POST + SSE stream)
    register/route.ts         (POST)
    track/route.ts            (POST)
    cron/reminders/route.ts   (GET)
```

### After

```
src/app/
  layout.tsx              # Root — unchanged (html + body + fonts)
  globals.css
  (public)/
    layout.tsx            # NEW — pass-through, future viewer chrome
    page.tsx              # moved
    demo/page.tsx         # moved
    webinar/[id]/         # moved (all sub-routes)
  (admin)/
    layout.tsx            # NEW — admin shell (container, nav placeholder)
    admin/
      page.tsx            # moved
  api/
    webinar/route.ts      # GET only (list)
    webinar/[id]/route.ts # GET only (single)
    webinar/[id]/chat/    # unchanged
    register/route.ts     # unchanged
    track/route.ts        # unchanged
    cron/reminders/route.ts # unchanged
    admin/
      webinar/route.ts          # NEW — POST (create)
      webinar/[id]/route.ts     # NEW — GET/PUT/DELETE
      registrations/route.ts    # NEW — GET + CSV export
```

## Layout Files

### Root layout (`src/app/layout.tsx`)
No changes. Stays as: `<html>`, `<body>`, Geist fonts, `globals.css`.

### Public layout (`src/app/(public)/layout.tsx`)
Pass-through wrapper. Public pages already handle their own styling.

```tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### Admin layout (`src/app/(admin)/layout.tsx`)
Minimal admin shell. Existing admin page has inline header/tabs.

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950">
      {children}
    </div>
  );
}
```

## API Route Split

### Public routes (read + user actions)

| Route | Methods | Purpose |
|---|---|---|
| `GET /api/webinar` | GET | List published webinars |
| `GET /api/webinar/[id]` | GET | Fetch single webinar |
| `GET/POST /api/webinar/[id]/chat` | GET, POST | Chat messages |
| `GET /api/webinar/[id]/chat/stream` | GET | SSE stream |
| `POST /api/register` | POST | User registration |
| `POST /api/track` | POST | Event tracking |
| `GET /api/cron/reminders` | GET | Scheduled email cron |

### Admin routes (new `/api/admin/` namespace)

| Route | Methods | Purpose |
|---|---|---|
| `POST /api/admin/webinar` | POST | Create webinar |
| `GET/PUT/DELETE /api/admin/webinar/[id]` | GET, PUT, DELETE | Full CRUD |
| `GET /api/admin/registrations` | GET | List registrations + CSV export |

### Migration steps for API routes

1. Copy POST handler from `api/webinar/route.ts` → `api/admin/webinar/route.ts`
2. Remove POST from `api/webinar/route.ts`
3. Copy PUT/DELETE from `api/webinar/[id]/route.ts` → `api/admin/webinar/[id]/route.ts`
4. Remove PUT/DELETE from `api/webinar/[id]/route.ts`
5. Create `api/admin/registrations/route.ts` for registration list + CSV export
6. Update fetch URLs in admin page to use `/api/admin/*`

## Out of Scope

- Authentication / middleware (separate task)
- Admin UI redesign (sidebar, theme changes)
- Refactoring 850-line admin page into components
- Changes to `src/lib/`, `src/components/`, or data models
- Changes to public user experience

## Verification

- `npm run build` passes
- `/admin` loads and CRUD works
- `/webinar/[id]/live` loads and plays correctly
- All public routes unaffected

## Future: Auth Preparation

This structure enables a single middleware matcher for auth:

```ts
matcher: ['/admin/:path*', '/api/admin/:path*']
```

One gate protects all admin operations (pages + API).
