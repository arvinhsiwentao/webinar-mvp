# Plan: Landing Page Deduplication

**Date:** 2026-02-23
**Status:** Draft
**Target files:**
- `src/app/(public)/page.tsx` (512 lines — hardcoded homepage)
- `src/app/(public)/webinar/[id]/page.tsx` (394 lines — dynamic landing)

## Problem

These two files are ~70% duplicated:
- Same form state (name, email, phone, selectedSession, submitting, formError)
- Same form submission logic (POST to `/api/register`, redirect to confirm page)
- Same session selector UI (radio-button-style cards)
- Same registration form (name, email, phone inputs + validation)
- Same loading/error states

The homepage is a single-webinar version (hardcoded `DEFAULT_WEBINAR_ID = '1'`). The dynamic page is the generic version. Both have the same registration flow but completely different marketing copy — this is intentional (homepage is Mike's custom sales page, dynamic page is generic).

## Goals

1. Extract shared **registration logic** and **form UI** into reusable pieces
2. Keep the two pages' marketing sections (hero, pain points, credibility, etc.) distinct — these are intentionally different per-page
3. Zero visual changes

## What's Shared vs. Unique

### Shared (extract):
- Form state management (name, email, phone, selectedSession, submitting, formError)
- `handleSubmit` logic (validate → POST → redirect)
- Session selector UI component
- Registration form inputs UI component
- Session selection logic (pick first future session)
- Loading spinner and error states

### Unique (keep in each page):
- **Homepage**: Hero with pain points, speaker credibility grid, benefits section, final CTA, social proof — this is conversion-optimized marketing copy
- **Dynamic page**: Simpler layout (hero, about, highlights, session picker, register form) — this is generic

## File Structure After Refactor

```
src/components/registration/
  useRegistrationForm.ts            # Custom hook: form state + submit logic (~60 lines)
  SessionSelector.tsx               # Session radio cards (~50 lines)
  RegistrationForm.tsx              # Name/email/phone inputs + submit button (~70 lines)

src/app/(public)/page.tsx           # Homepage with marketing sections (~350 lines, down from 512)
src/app/(public)/webinar/[id]/page.tsx  # Dynamic page (~230 lines, down from 394)
```

## Tasks

### T1: Create `useRegistrationForm` hook

Extract the duplicated form logic into a custom hook:

```tsx
interface UseRegistrationFormOptions {
  webinarId: string;
  onSuccess: (sessionId: string, name: string) => void;  // redirect callback
  onFormStart?: () => void;  // tracking callback
}

interface UseRegistrationFormReturn {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  selectedSession: string; setSelectedSession: (v: string) => void;
  submitting: boolean;
  formError: string;
  handleSubmit: (e: React.FormEvent) => void;
}
```

This encapsulates:
- All form state (`useState` calls)
- Validation (`validateEmail`, empty name check)
- API call (POST `/api/register`)
- Error handling

Currently duplicated at:
- Homepage: lines 52-87
- Dynamic page: lines 50-87

### T2: Create `SessionSelector` component

Extract the session radio card UI used in both pages:

```tsx
interface SessionSelectorProps {
  sessions: Session[];
  selectedId: string;
  onSelect: (id: string) => void;
}
```

Currently duplicated at:
- Homepage: lines 380-413
- Dynamic page: lines 283-317

Both use the same radio-button-style cards with gold accent border.

### T3: Create `RegistrationForm` component

Extract the form inputs (name, email, phone, submit button, error display):

```tsx
interface RegistrationFormProps {
  name: string; onNameChange: (v: string) => void;
  email: string; onEmailChange: (v: string) => void;
  phone: string; onPhoneChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  formError: string;
  submitLabel?: string;          // "确认报名 — 100% 免费" vs "确认报名"
  onFormStart?: () => void;      // for tracking (dynamic page tracks form_start)
}
```

Currently duplicated at:
- Homepage: lines 417-464
- Dynamic page: lines 329-377

### T4: Refactor homepage to use shared components

Replace inline form state/logic with `useRegistrationForm` hook. Replace inline session selector and form with extracted components. Keep all marketing sections (hero, pain points, credibility, benefits, final CTA) untouched.

Also extract the "select first future session" logic (homepage lines 35-41) into the hook's initialization, since it's duplicated.

**Expected reduction:** 512 → ~350 lines (removed ~160 lines of duplicated form/selector code).

### T5: Refactor dynamic page to use shared components

Same treatment. Keep hero, about, highlights sections. Replace form/selector.

**Expected reduction:** 394 → ~230 lines.

## Execution Order

T1 → T2, T3 (parallel) → T4, T5 (parallel)

## Risks

- **Styling differences:** The two pages have slightly different input styling. Homepage uses `border-b` underline inputs; dynamic page uses the same. Verify both use the same Tailwind classes — if they differ, pass a `className` prop.
- **Tracking:** Dynamic page tracks `form_start` on name input focus (line 336) and `form_submit` on success (line 80). Homepage does not. The `onFormStart` prop handles this.
- **Session selection logic:** Homepage picks "first future session" (lines 35-41). Dynamic page picks `sessions[0]` (line 39). Consolidate into hook with `pickFirstFuture` option.

## Verification

1. `npx tsc --noEmit` — clean compile
2. Manual test: visit `/` (homepage) — full registration flow works
3. Manual test: visit `/webinar/1` (dynamic) — full registration flow works
4. Verify tracking events still fire on dynamic page (form_start, form_submit)
