# PhotoEditor Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default favicon with an approved bright-blue personal-tool icon for PhotoEditor.

**Architecture:** Keep the existing favicon integration in `index.html` and replace only the SVG asset so the page wiring stays unchanged. The icon should use a single bright-blue badge shape and a minimal white toolbox mark optimized for favicon sizes.

**Tech Stack:** HTML, SVG

---

## File Structure

- Modify: `favicon.svg` — replace the current generic line icon with the approved badge-style toolbox favicon
- Keep: `index.html` — existing favicon link remains the integration point

### Task 1: Replace the favicon asset

**Files:**
- Modify: `favicon.svg`
- Verify: `index.html:7`

- [ ] **Step 1: Inspect the current favicon wiring**

Confirm that `index.html` already loads the SVG favicon:

```html
<link rel="icon" href="favicon.svg" type="image/svg+xml">
```

- [ ] **Step 2: Replace the SVG with the approved design**

Write this SVG into `favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="8" y="8" width="48" height="48" rx="14" fill="#198CFF"/>
  <rect x="18" y="22" width="28" height="20" rx="6" fill="#FFFFFF"/>
  <path d="M43 24l-7 7" stroke="#198CFF" stroke-width="4" stroke-linecap="round"/>
  <path d="M30 29l5 5" stroke="#198CFF" stroke-width="4" stroke-linecap="round"/>
  <circle cx="24" cy="32" r="2.5" fill="#198CFF"/>
</svg>
```

- [ ] **Step 3: Verify the page still points to the same favicon file**

Check that `index.html` still contains:

```html
<link rel="icon" href="favicon.svg" type="image/svg+xml">
```

Expected: unchanged.

- [ ] **Step 4: Start a local server for manual browser verification**

Run:

```bash
python3 -m http.server 8888
```

Expected: server starts successfully and serves the project directory.

- [ ] **Step 5: Open the page and verify the favicon visually**

Open `http://localhost:8888` in a browser tab and confirm:
- the tab icon is blue
- the main silhouette reads as a compact personal tool badge
- the icon remains legible at tab size

- [ ] **Step 6: Commit**

```bash
git add favicon.svg .harness/specs/active/spec-260529-photo-editor-favicon.md .harness/plans/active/plan-260529-photo-editor-favicon.md
git commit -m "feat: update photo editor favicon"
```
