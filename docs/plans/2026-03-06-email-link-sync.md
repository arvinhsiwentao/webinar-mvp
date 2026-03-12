# Email Link & Late-Join Sync Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix confirmation email link to include slot parameter, and redirect ended-event visitors to the end page (with purchase CTA) instead of the missed-session reassignment flow.

**Architecture:** Two surgical edits — one in the registration API to fix the email URL, one in the lobby page to change MISSED state behavior from "pick new slot" to "redirect to end page."

**Tech Stack:** Next.js App Router, existing SendGrid email integration

---

### Task 1: Add slot parameter to confirmation email link

**Files:**
- Modify: `src/app/api/register/route.ts:72`

**Step 1: Fix the lobby URL to include slot**

Current code (line 72):
```typescript
const liveUrl = `${origin}/webinar/${body.webinarId}/lobby?name=${encodeURIComponent(body.name)}`;
```

Change to:
```typescript
const slotParam = body.assignedSlot ? `&slot=${encodeURIComponent(body.assignedSlot)}` : '';
const liveUrl = `${origin}/webinar/${body.webinarId}/lobby?name=${encodeURIComponent(body.name)}${slotParam}`;
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/register/route.ts
git commit -m "fix: include slot param in confirmation email link"
```

---

### Task 2: Redirect MISSED state to end page instead of reassignment

**Files:**
- Modify: `src/app/(public)/webinar/[id]/lobby/page.tsx:170-191`

**Step 1: Replace MISSED handling with redirect to end page**

Current code (lines 170-191):
```typescript
if (evergreenState === 'MISSED' && nextSlotTime) {
  const sticky = typeof window !== 'undefined' ? localStorage.getItem(`webinar-${webinarId}-evergreen`) : null;
  const registrationId = sticky ? JSON.parse(sticky).registrationId : '';

  return (
    <MissedSessionPrompt
      missedSlotTime={slotTime!}
      nextSlotTime={nextSlotTime}
      webinarId={webinarId}
      registrationId={registrationId || ''}
      onReassigned={(newSlot, expiresAt) => {
        // ...
      }}
    />
  );
}
```

Replace with:
```typescript
if (evergreenState === 'MISSED') {
  router.replace(`/webinar/${webinarId}/end?name=${encodeURIComponent(userName)}`);
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

**Step 2: Remove unused imports and code**

Remove the `nextSlotTime` state variable (line 25) and the `MissedSessionPrompt` import (line 7) and the fetch to `/api/webinar/${webinarId}/next-slot` (lines 53-61) since they are no longer used.

Check if `MissedSessionPrompt` is used elsewhere before removing the import:
```bash
grep -r "MissedSessionPrompt" src/ --include="*.tsx" --include="*.ts"
```

If only used in lobby, clean up the import.

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(public\)/webinar/\[id\]/lobby/page.tsx
git commit -m "fix: redirect ended events to end page instead of reassignment"
```
