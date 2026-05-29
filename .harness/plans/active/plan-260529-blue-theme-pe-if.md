# PE and IF Blue Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align PhotoEditor and iframer with the same blue brand theme while preserving their current layouts and behavior.

**Architecture:** Keep each tool’s current structure intact and only update the brand-facing style entry points. PhotoEditor will be changed through its existing CSS theme tokens, while iframer will be updated inline because its styles and favicon are defined directly in its single HTML entry file.

**Tech Stack:** HTML, CSS, SVG

---

## File Structure

- Modify: `photo-editor/css/settings/_variables.css` — adjust PhotoEditor’s shared theme tokens to the approved blue palette
- Modify: `iframer/index.html` — update iframer favicon and key blue theme accents in its inline styles
- Keep: `photo-editor/index.html` — favicon wiring already exists and should remain unchanged

### Task 1: Update PhotoEditor theme tokens

**Files:**
- Modify: `photo-editor/css/settings/_variables.css`
- Verify: `photo-editor/index.html:7`

- [ ] **Step 1: Write the failing verification note**

Create this manual expectation before editing code:

```text
PhotoEditor should use a brighter brand blue for primary controls and slightly cooler neutral surfaces, but the page structure and tool workflows must remain unchanged.
```

- [ ] **Step 2: Verify current state differs from the target**

Open `http://localhost:8888/photo-editor/` and confirm the current primary blue and surrounding neutrals do not yet match the root page blue brand.

Expected: FAIL against the target visual expectation.

- [ ] **Step 3: Update the theme token values**

Set `photo-editor/css/settings/_variables.css` to:

```css
:root {
  --color-bg: #f8fbff;
  --color-surface: #f3f8ff;
  --color-surface-hover: #e5f0ff;
  --color-border: #cfe0f5;
  --color-text: #1b3147;
  --color-text-secondary: #5d7288;
  --color-primary: #198cff;
  --color-primary-hover: #0f7be6;
  --color-danger: #ff4444;
  --color-tooltip-bg: #1b3147;
  --color-canvas-bg: #edf4fb;

  --toolbar-width: 72px;
  --property-bar-height: 56px;
  --border-radius: 6px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --icon-size: 20px;
  --transition-fast: 0.15s ease;
}
```

- [ ] **Step 4: Verify the updated PhotoEditor theme**

Open `http://localhost:8888/photo-editor/` again and confirm:
- primary controls use the brighter brand blue
- neutral surfaces feel slightly cooler
- layout and tool behavior are unchanged

Expected: PASS.

### Task 2: Update iframer blue branding

**Files:**
- Modify: `iframer/index.html`

- [ ] **Step 1: Write the failing verification note**

Create this manual expectation before editing code:

```text
iframer should keep its current split layout, but its favicon, title bars, and accent UI should use the same blue brand language as the root page and PhotoEditor.
```

- [ ] **Step 2: Verify current state differs from the target**

Open `http://localhost:8888/iframer/` and confirm the current deep gray favicon and title bars do not match the blue brand target.

Expected: FAIL against the target visual expectation.

- [ ] **Step 3: Replace the inline favicon and blue accent styles**

Update `iframer/index.html` so the favicon becomes a blue toolbox-style SVG and the style values below are used:

```html
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='8' y='8' width='48' height='48' rx='14' fill='%23198CFF'/%3E%3Cpath d='M22 24h20a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V28a4 4 0 0 1 4-4Z' fill='%23FFFFFF'/%3E%3Cpath d='M26 21h12a3 3 0 0 1 3 3v2H23v-2a3 3 0 0 1 3-3Z' fill='%23FFFFFF'/%3E%3Cpath d='M43 23l-7 7' stroke='%23198CFF' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M31 28l5 5' stroke='%23198CFF' stroke-width='4' stroke-linecap='round'/%3E%3Ccircle cx='25' cy='33' r='2.5' fill='%23198CFF'/%3E%3C/svg%3E" type="image/svg+xml">
```

And set the key colors in the inline CSS to:

```css
body { background: #f3f8ff; }
.editor, .preview { background: #ffffff; border: 1px solid #d7e7fb; box-shadow: 0 10px 30px rgba(17, 67, 122, 0.08); }
.title { background: #198cff; color: white; }
#preview-area { background: #eef5ff; }
#error { color: #b42318; background: #fdebec; }
.resizer { background: #d7e7fb; border-left: 1px solid #c1d9f8; border-right: 1px solid #c1d9f8; }
.resizer:hover { background: #b8d7fb; }
```

Also update the drag-state JS color changes to use the same blue-family values instead of gray.

- [ ] **Step 4: Verify the updated iframer theme**

Open `http://localhost:8888/iframer/` again and confirm:
- favicon is blue
- title bars are blue
- resizer and background accents match the blue theme
- layout and rendering behavior are unchanged

Expected: PASS.

### Task 3: Final manual verification

**Files:**
- Verify: `index.html`
- Verify: `photo-editor/index.html`
- Verify: `iframer/index.html`

- [ ] **Step 1: Open all three pages**

Open:

```text
http://localhost:8888/
http://localhost:8888/photo-editor/
http://localhost:8888/iframer/
```

- [ ] **Step 2: Verify visual consistency**

Confirm:
- all three pages use the same bright blue brand anchor
- PE and IF still behave like lightweight tools, not marketing pages
- no layout or interaction regressions are visible

Expected: PASS.
