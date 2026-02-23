# Plan: Admin Page Refactor

**Date:** 2026-02-23
**Status:** Draft
**Target file:** `src/app/(admin)/admin/page.tsx` (863 lines → ~5 files, ~150-200 lines each)

## Problem

The admin page is a single 863-line monolith with 4 inline sub-components (`WebinarList`, `RegistrationList`, `WebinarForm`, `exportCSV`). The `WebinarForm` alone is 515 lines (lines 349-863) with repetitive array mutation patterns for sessions, autoChat, and ctaEvents.

## Goals

1. Split into focused component files
2. Eliminate repetitive array mutation boilerplate
3. Keep the same visual design and functionality — zero UI changes

## File Structure After Refactor

```
src/app/(admin)/admin/
  page.tsx                          # Shell: header, tabs, routing (~130 lines)
  _components/
    WebinarList.tsx                  # List view with status badges (~100 lines)
    RegistrationList.tsx             # Registration table + CSV export (~120 lines)
    WebinarForm.tsx                  # Form container + submit logic (~180 lines)
    ArrayFieldEditor.tsx             # Reusable list editor for sessions/chat/CTA (~80 lines)
```

## Tasks

### T1: Create `ArrayFieldEditor` — Reusable array item editor

Extract the repetitive pattern used in sessions (lines 588-612), autoChat (lines 631-674), and ctaEvents (lines 701-784). All three follow this identical structure:

```tsx
// Current pattern (repeated 3 times with slight field variations):
const newItems = [...items];
newItems[idx].fieldName = value;
setItems(newItems);
```

Create a generic `ArrayFieldEditor<T>` component:

```tsx
interface ArrayFieldEditorProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (field: keyof T, value: T[keyof T]) => void) => ReactNode;
  createEmpty: () => T;
  addLabel: string;
  emptyLabel?: string;
}
```

This handles: add item, remove item, update single field — the same logic currently duplicated 3x.

### T2: Extract `WebinarList` to `_components/WebinarList.tsx`

Move lines 134-233 to own file. Interface stays the same:

```tsx
interface WebinarListProps {
  webinars: Webinar[];
  loading: boolean;
  onEdit: (w: Webinar) => void;
  onDelete: (id: string) => void;
}
```

No logic changes needed — this is a pure move.

### T3: Extract `RegistrationList` to `_components/RegistrationList.tsx`

Move lines 235-347 (includes `exportCSV` helper) to own file. Make `exportCSV` a module-level function in the same file.

```tsx
interface RegistrationListProps {
  webinars: Webinar[];
}
```

Pure move, no logic changes.

### T4: Extract `WebinarForm` to `_components/WebinarForm.tsx`

Move lines 349-863 to own file. Refactor to use `ArrayFieldEditor` for:
- **Sessions** — 1 field: `startTime` (datetime-local)
- **AutoChat** — 3 fields: `timeSec`, `name`, `message`
- **CTAEvents** — 6 fields: `showAtSec`, `hideAtSec`, `buttonText`, `url`, `promoText`, `showCountdown`

This eliminates ~120 lines of duplicated array mutation code.

```tsx
interface WebinarFormProps {
  webinar?: Webinar;
  onSaved: () => void;
}
```

### T5: Slim down `page.tsx` to shell only

After extraction, page.tsx becomes:
- Imports + state (activeTab, webinars, editingWebinar)
- `fetchWebinars`, `handleEdit`, `handleDelete`, `handleSaved`
- JSX: header, tabs, conditional content rendering

Expected: ~130 lines.

## Execution Order

T1 → T4 → T2 → T3 → T5 (T1 must exist before T4 uses it; T2/T3 are independent)

## Risks

- **Admin API routes:** The form POSTs to `/api/admin/webinar` — verify these routes exist and accept the same payload shape. No API changes needed.
- **Tailwind classes:** Long class strings should be preserved exactly to avoid visual regressions.

## Verification

1. `npx tsc --noEmit` — clean compile
2. Manual test: navigate to `/admin`, verify list/create/edit/registrations tabs all work
3. Verify CSV export still triggers download
