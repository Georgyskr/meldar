# Accessibility Review -- Meldar PoC

**Reviewer:** Accessibility Specialist
**Date:** 2026-03-30
**Standard:** WCAG 2.1 AA
**Scope:** All new UI components in the X-Ray flow, billing, founding program, and updated shared components

---

## Summary

The codebase has a solid foundation -- semantic HTML elements are used in most places, and a few components already include `aria-label` and `aria-hidden` attributes. However, there are **13 issues** across the reviewed files, including several Critical and Serious items that would cause failures for screen reader users and keyboard-only users.

| Severity | Count |
|----------|-------|
| Critical | 4     |
| Serious  | 5     |
| Moderate | 3     |
| Minor    | 1     |

---

## Critical Issues

### C1. Hidden file input has no accessible label
**File:** `src/features/screenshot-upload/ui/UploadZone.tsx:82-106`
**WCAG:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value

The `<input type="file">` is visually hidden with `display: none` and wrapped in a `<label>`, but the label has no text associated with the input -- the label's text content changes based on state and is not programmatically tied to the input via `htmlFor`/`id`. Screen readers may announce this as "file upload" with no context.

**Fix:** Add an `id` to the input and `htmlFor` to the label, or add `aria-label="Upload Screen Time screenshot"` to the input element.

```tsx
<input
  ref={fileRef}
  type="file"
  id="screentime-upload"
  aria-label="Upload Screen Time screenshot"
  accept="image/jpeg,image/png,image/webp"
  ...
/>
```

---

### C2. Processing states not announced to screen readers
**File:** `src/features/screenshot-upload/ui/UploadZone.tsx:141-156`
**WCAG:** 4.1.3 Status Messages

When the upload progresses through steps (Compressing, Uploading, Detecting, Generating), these status changes are purely visual. Screen reader users have no indication that processing is happening or what step they are on.

**Fix:** Add an `aria-live="polite"` region around the progress steps, and add `role="status"` so screen readers announce each step change.

```tsx
<VStack gap={3} textAlign="center" aria-live="polite" role="status">
  {STEPS.map((label, i) => (
    ...
  ))}
</VStack>
```

---

### C3. Error messages not announced and not associated with input
**File:** `src/features/screenshot-upload/ui/UploadZone.tsx:158-181`
**WCAG:** 3.3.1 Error Identification, 4.1.3 Status Messages

When an upload fails, the error message appears visually but is not announced to screen readers. The error is also not associated with the file input via `aria-describedby`.

**Fix:** Add `role="alert"` to the error container so it is announced immediately, and link it to the input with `aria-describedby`.

```tsx
<VStack gap={2} textAlign="center" role="alert">
  <styled.span id="upload-error" textStyle="body.base" color="red.500" fontWeight="500">
    {errorMsg}
  </styled.span>
  ...
</VStack>
```

And on the input: `aria-describedby={state === 'error' ? 'upload-error' : undefined}`

---

### C4. Error message in FoundingEmailCapture not associated with input
**File:** `src/features/founding-program/ui/FoundingEmailCapture.tsx:98-101`
**WCAG:** 3.3.1 Error Identification, 4.1.3 Status Messages

The error message "Something went wrong. Try again." is not announced to screen readers and is not programmatically associated with the email input.

**Fix:** Add `role="alert"` to the error element and connect it via `aria-describedby` on the input.

```tsx
{status === 'error' && (
  <styled.span id="founding-email-error" role="alert" textStyle="body.sm" color="red.500">
    Something went wrong. Try again.
  </styled.span>
)}
```

And on the input: `aria-describedby={status === 'error' ? 'founding-email-error' : undefined}`

---

## Serious Issues

### S1. Focus not managed after upload completes
**File:** `src/app/xray/xray-client.tsx:17-20`
**WCAG:** 2.4.3 Focus Order

When the upload completes and the result replaces the upload zone, focus is not moved to the new content. Screen reader users are left focused on a now-removed element (or nowhere). Keyboard users must Tab through the entire page to find the results.

**Fix:** After `setResult(data)`, programmatically move focus to the X-Ray card heading or the result container. Use a ref on the result section and call `.focus()` after render.

```tsx
const resultRef = useRef<HTMLDivElement>(null)

function handleResult(data: ResultData) {
  setResult(data)
  setShowDeletionBanner(true)
  setTimeout(() => {
    resultRef.current?.focus()
    setShowDeletionBanner(false)
  }, 100)
}

// On the result container:
<VStack ref={resultRef} tabIndex={-1} gap={6} width="100%">
```

---

### S2. Deletion banner not announced
**File:** `src/app/xray/xray-client.tsx:46-60`
**WCAG:** 4.1.3 Status Messages

The "Screenshot deleted" success banner appears for 5 seconds but is not announced to screen readers.

**Fix:** Add `role="status"` and `aria-live="polite"` to the banner.

```tsx
<Box role="status" aria-live="polite" ...>
```

---

### S3. "Copied!" state change not announced
**File:** `src/entities/xray-result/ui/XRayCardActions.tsx:69-74`
**WCAG:** 4.1.3 Status Messages

When the user clicks "Copy link" and it changes to "Copied!", this feedback is only visual. Screen reader users receive no confirmation.

**Fix:** Add `aria-live="polite"` to the button or use an `aria-label` that updates.

```tsx
<styled.button
  onClick={handleCopy}
  aria-live="polite"
  ...
>
```

---

### S4. PurchaseButton loading state not announced
**File:** `src/features/billing/ui/PurchaseButton.tsx:69`
**WCAG:** 4.1.3 Status Messages

When clicked, the button text changes from the label to "Redirecting..." but this change is not announced. Users relying on screen readers may not know a redirect is in progress.

**Fix:** Add `aria-live="polite"` to the button, or add `aria-busy={loading}` to indicate processing.

```tsx
<styled.button
  onClick={handleClick}
  disabled={loading}
  aria-busy={loading}
  aria-live="polite"
  ...
>
```

---

### S5. XRayCard data table is not structured for screen readers
**File:** `src/entities/xray-result/ui/XRayCard.tsx:48-123`
**WCAG:** 1.3.1 Info and Relationships

The X-Ray card presents tabular data (app names with usage hours, daily pickups, total screen time) using `Flex` and `styled.span` elements. Screen readers cannot convey the relationship between labels and values.

**Fix:** Use a definition list (`<dl>`, `<dt>`, `<dd>`) for the key-value pairs, or a `<table>` for the app list. At minimum, use `aria-label` on the card container to describe it.

```tsx
<Box
  role="region"
  aria-label="Your Time X-Ray results"
  ...
>
```

For the app list, consider:
```tsx
<styled.table width="100%">
  <caption className="sr-only">Top apps by screen time</caption>
  ...
</styled.table>
```

---

## Moderate Issues

### M1. Touch targets may be too small on some buttons
**Files:**
- `src/entities/xray-result/ui/XRayCardActions.tsx:31-50` (Share/Copy buttons)
- `src/widgets/footer/Footer.tsx:48-65` (footer links and Cookie Settings button)
**WCAG:** 2.5.5 Target Size (Enhanced), 2.5.8 Target Size (Minimum)

The Share and Copy link buttons use `paddingInline={4} paddingBlock={2}` with `fontSize="sm"`, which may result in a touch target smaller than 44x44px on mobile. The footer links use `fontSize="3xs"`, which is extremely small and likely produces touch targets well under 44px.

**Fix:** Ensure minimum `paddingBlock={3}` or `minHeight="44px"` on all interactive elements. For footer links, increase padding or add `minHeight="44px"` and `display="inline-flex" alignItems="center"`.

---

### M2. Decorative avatar circles lack alt text handling
**File:** `src/widgets/landing/TrustSection.tsx:76-87`
**WCAG:** 1.1.1 Non-text Content

The 12 colored circles representing team avatars are decorative but not marked as `aria-hidden="true"`. Screen readers may announce each as a generic container element, creating noise.

**Fix:** Add `aria-hidden="true"` to the parent `<Flex>` wrapping the avatars, or add `role="presentation"` to each avatar `<Box>`.

```tsx
<Flex justifyContent="center" aria-hidden="true">
  {['a', 'b', ...].map(...)}
</Flex>
```

---

### M3. Check icons in FoundingEmailCapture benefit list not hidden
**File:** `src/features/founding-program/ui/FoundingEmailCapture.tsx:84-96`
**WCAG:** 1.1.1 Non-text Content

The `<Check>` icons before each benefit are decorative but not marked `aria-hidden="true"`. Screen readers may announce them as images or SVGs.

**Fix:** Add `aria-hidden="true"` to each Check icon.

```tsx
<Check size={12} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
```

---

## Minor Issues

### m1. Upload zone "Choose image" span looks like a button but is not one
**File:** `src/features/screenshot-upload/ui/UploadZone.tsx:122-132`
**WCAG:** 4.1.2 Name, Role, Value

The "Choose image" text is styled to look like a button (pill shape, background color) but is a `<span>` inside a `<label>`. While clicking it does trigger the file input (because the whole label is clickable), screen readers will not announce it as an interactive control. The `<Upload>` icon inside it also lacks `aria-hidden="true"`.

**Fix:** Add `aria-hidden="true"` to the Upload icon. The label wrapping the input is functional, so the span is acceptable, but consider adding `role="button"` to the span for clearer semantics, or restructure so the file input itself is visible and styled.

---

## Positive Observations

The following accessibility practices are already in place and should be maintained:

1. **TrustSection** (`TrustSection.tsx:110,120,140`): Icons correctly use `aria-hidden="true"` -- good pattern.
2. **EmailCapture** (`EmailCapture.tsx:50`): Email input has `aria-label="Your email address"` -- properly labeled.
3. **FoundingEmailCapture** (`FoundingEmailCapture.tsx:46`): Also uses `aria-label` on the email input.
4. **EmailCapture** (`EmailCapture.tsx:86`): Submit button has `_focusVisible` styling for keyboard focus indication.
5. **Semantic HTML**: `<main>`, `<section>`, `<footer>`, `<form>`, `<h1>`-`<h3>` elements are used correctly throughout.
6. **Thank You and Coming Soon pages**: Proper heading hierarchy with `<h1>`.

---

## Recommended Priority

1. **Immediate (before launch):** C1, C2, C3, C4, S1 -- these block basic screen reader usability of the core X-Ray flow.
2. **Short-term:** S2, S3, S4, S5 -- these affect the quality of the screen reader experience.
3. **Next iteration:** M1, M2, M3, m1 -- these improve polish and full WCAG compliance.

---

## Color Contrast Notes

Several components use `onSurfaceVariant/60`, `onSurface/40`, `onSurface/30`, and `onSurface/20` for text colors. Without knowing the exact resolved hex values and background colors, these fractional-opacity tokens are a concern:

- **`onSurface/20` and `onSurface/30`** (Footer.tsx:42,44): Very likely to fail the 4.5:1 contrast ratio on light backgrounds. Footer text like "Built by 12 senior engineers in Helsinki" at 20% opacity will be nearly invisible.
- **`onSurfaceVariant/60`** (UploadZone.tsx:134, UpsellBlock.tsx:43): May be borderline. Should be tested with the actual resolved colors.
- **`white/70`** (XRayCard.tsx:43) on a gradient background: Should be checked -- 70% white on the lighter end of the gradient (#FFB876) may fail.

**Recommendation:** Run these through a contrast checker with the actual computed colors. The footer text at `onSurface/20` almost certainly fails WCAG AA.
