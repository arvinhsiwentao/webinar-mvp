# Order Product Package & Sales Code Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `productPackageId` and `salesCode` fields to webinars (config) and orders (recorded at fulfillment), so each fulfilled order captures the webinar's product package ID and sales code.

**Architecture:** Two new TEXT columns on both `webinars` and `orders` tables. Webinar admin form exposes the config fields. During fulfillment, `fulfillOrder()` reads the webinar to copy the values onto the order. Google Sheets sync includes the new columns.

**Tech Stack:** Supabase (Postgres migration), Next.js, TypeScript, Google Sheets API v4.

---

### Task 1: Supabase migration — add columns to both tables

**Files:**
- Supabase SQL migration (run via MCP or dashboard)

**Context:** Both `webinars` and `orders` tables need two new nullable TEXT columns. The automatic `snakeToCamel` / `camelToSnake` mapping in `db.ts` handles column name conversion, so no db.ts query changes are needed.

**Step 1: Run the migration**

```sql
ALTER TABLE webinars
  ADD COLUMN product_package_id TEXT,
  ADD COLUMN sales_code TEXT;

ALTER TABLE orders
  ADD COLUMN product_package_id TEXT,
  ADD COLUMN sales_code TEXT;
```

**Step 2: Verify columns exist**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('webinars', 'orders')
  AND column_name IN ('product_package_id', 'sales_code');
```

Expected: 4 rows returned.

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/lib/types.ts:52-93` (Webinar interface)
- Modify: `src/lib/types.ts:124-139` (Order interface)
- Modify: `src/lib/types.ts:157-181` (CreateWebinarRequest interface)

**Step 1: Add fields to Webinar interface**

In `src/lib/types.ts`, inside the `Webinar` interface, add after `endPageCtaText?`:

```typescript
  // Product fulfillment config
  productPackageId?: string;  // 商品包編號
  salesCode?: string;         // 銷售代碼
```

**Step 2: Add fields to Order interface**

In `src/lib/types.ts`, inside the `Order` interface, add after `fulfilledAt?`:

```typescript
  productPackageId?: string;  // 商品包編號 (copied from webinar at fulfillment)
  salesCode?: string;         // 銷售代碼 (copied from webinar at fulfillment)
```

**Step 3: Add fields to CreateWebinarRequest interface**

In `src/lib/types.ts`, inside `CreateWebinarRequest`, add:

```typescript
  productPackageId?: string;
  salesCode?: string;
```

**Step 4: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add productPackageId and salesCode to Webinar and Order types"
```

---

### Task 3: Update fulfillment to copy webinar fields to order

**Files:**
- Modify: `src/lib/fulfillment.ts`

**Context:** Currently `fulfillOrder()` has the order (which has `webinarId`) but doesn't load the webinar. We need to import `getWebinarById` from `db.ts` and read the webinar to get `productPackageId` and `salesCode`, then include them in the `updateOrder()` call.

**Step 1: Add import**

Add `getWebinarById` to the existing import from `@/lib/db`:

```typescript
import { getOrderBySessionId, updateOrder, updateOrderStatus, getWebinarById } from '@/lib/db';
```

**Step 2: Load webinar and include fields in updateOrder**

Inside the `try` block (after `claimActivationCode` succeeds, around line 44), update the `updateOrder` call:

```typescript
    // Load webinar to get product config
    const webinar = await getWebinarById(order.webinarId);

    const now = new Date().toISOString();
    await updateOrder(order.id, {
      status: 'fulfilled',
      activationCode: code,
      stripePaymentIntentId: resolvedPaymentIntentId,
      paidAt: now,
      fulfilledAt: now,
      productPackageId: webinar?.productPackageId,
      salesCode: webinar?.salesCode,
    });
```

**Step 3: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/fulfillment.ts
git commit -m "feat: copy productPackageId and salesCode from webinar to order at fulfillment"
```

---

### Task 4: Update Google Sheets sync to include new columns

**Files:**
- Modify: `src/lib/google-sheets.ts:8-9` (range constant)
- Modify: `src/lib/google-sheets.ts:134-154` (header and data rows)

**Step 1: Update sheet range**

Change:
```typescript
const ORDERS_SHEET_RANGE = 'Orders!A:K';
```
To:
```typescript
const ORDERS_SHEET_RANGE = 'Orders!A:M';
```

**Step 2: Update header and data rows**

Update the header array to add two new columns:

```typescript
  const header = [
    'ID', 'Webinar ID', 'Email', 'Name', 'Status',
    'Amount', 'Currency', 'Activation Code',
    'Created At', 'Paid At', 'Fulfilled At',
    'Product Package ID', 'Sales Code',
  ];
```

Update the data row mapping to include the new fields:

```typescript
  const dataRows = orders.map(order => [
    order.id,
    order.webinarId,
    order.email,
    order.name,
    order.status,
    order.amount,
    order.currency,
    order.activationCode ?? '',
    order.createdAt,
    order.paidAt ?? '',
    order.fulfilledAt ?? '',
    order.productPackageId ?? '',
    order.salesCode ?? '',
  ]);
```

**Step 3: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/google-sheets.ts
git commit -m "feat: add productPackageId and salesCode columns to orders Google Sheets sync"
```

---

### Task 5: Add admin form fields for webinar config

**Files:**
- Modify: `src/app/(admin)/admin/_components/WebinarForm.tsx:23-42` (form state)
- Modify: `src/app/(admin)/admin/_components/form/PromoSection.tsx` (interface + form fields)

**Step 1: Add to WebinarForm state**

In `WebinarForm.tsx`, add to the `formData` useState object (after `endPageCtaText`):

```typescript
    productPackageId: webinar?.productPackageId || '',
    salesCode: webinar?.salesCode || '',
```

**Step 2: Update PromoSection interface**

In `PromoSection.tsx`, add to `PromoFormFields`:

```typescript
  productPackageId: string;
  salesCode: string;
```

**Step 3: Add form inputs to PromoSection**

In `PromoSection.tsx`, add a new section after the "End Page Settings" section (before the closing `</>`):

```tsx
      {/* Product Fulfillment Config */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">商品出货设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">商品包编号</label>
            <input
              type="text"
              value={formData.productPackageId}
              onChange={(e) => onFieldChange('productPackageId', e.target.value)}
              placeholder="例如: 8764"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">销售代码</label>
            <input
              type="text"
              value={formData.salesCode}
              onChange={(e) => onFieldChange('salesCode', e.target.value)}
              placeholder="例如: 12991"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
        </div>
      </section>
```

**Step 4: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/(admin)/admin/_components/WebinarForm.tsx src/app/(admin)/admin/_components/form/PromoSection.tsx
git commit -m "feat: add productPackageId and salesCode config fields to admin webinar form"
```

---

### Task 6: Set default values for existing webinar

**Context:** The current webinar (ID `1`, "Mike是麥克") needs the values set: `productPackageId = '8764'`, `salesCode = '12991'`.

**Step 1: Update via Supabase SQL**

```sql
UPDATE webinars
SET product_package_id = '8764', sales_code = '12991'
WHERE id = '1';
```

**Step 2: Verify**

```sql
SELECT id, title, product_package_id, sales_code FROM webinars WHERE id = '1';
```

Expected: Row shows `product_package_id = '8764'`, `sales_code = '12991'`.

---

### Task 7: Update documentation

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/decisions.md`

**Step 1: Update architecture.md**

In the Data Models section, note the new fields on Webinar and Order.

**Step 2: Update decisions.md**

Append:
```markdown
### 2026-03-17: Product package ID and sales code on orders

**Decision:** Store `productPackageId` and `salesCode` as webinar-level config, copied to order at fulfillment time.
**Why:** These values identify the product package and sales channel for each purchase. Stored at webinar level so they can vary per webinar. Copied to order at fulfillment so the order is a self-contained record even if webinar config changes later.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: add productPackageId and salesCode to architecture and decisions"
```

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| Supabase migration | SQL | Add columns to `webinars` and `orders` tables |
| `src/lib/types.ts` | Modify | Add fields to `Webinar`, `Order`, `CreateWebinarRequest` |
| `src/lib/fulfillment.ts` | Modify | Load webinar, copy fields to order at fulfillment |
| `src/lib/google-sheets.ts` | Modify | Add columns to orders sync sheet |
| `src/app/(admin)/admin/_components/WebinarForm.tsx` | Modify | Add form state fields |
| `src/app/(admin)/admin/_components/form/PromoSection.tsx` | Modify | Add form inputs |
| `docs/architecture.md` | Modify | Document new fields |
| `docs/decisions.md` | Modify | Record decision |
