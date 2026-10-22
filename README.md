# OmniAudit Studio

**Self-Hosted Visual UI/UX, Conversion (CRO) & Design Token Auditing Platform**  
*Built with Next.js, Playwright Headless/Headed Automation, Deterministic DOM Probes, and Vision AI.*

![License](https://img.shields.io/badge/license-MIT-8AB6D6)
![Stack](https://img.shields.io/badge/stack-Next.js%2015%20%7C%20Playwright%20%7C%20TypeScript-333333)
![RAM Safe](https://img.shields.io/badge/Low--RAM%20Optimized-4GB--8GB%20Ready-22C55E)

---

## Why OmniAudit Studio Exists

When you ask a standard LLM (`"Audit this website URL"`), it only fetches raw HTML source code. It cannot see rendered CSS grids, broken visual hierarchy, overlapping elements, low-contrast buttons over background images, or mobile horizontal overflow.

**OmniAudit Studio** solves this by running a local Playwright browser engine that visits target pages across **Desktop (`1440×900`)**, **Tablet (`768×1024`)**, and **Mobile (`375×812`)** viewports, triggers lazy-loaded assets, snaps full-page and above-the-fold screenshots, and injects a deterministic DOM telemetry probe (`dom-probe.ts`) before synthesizing findings.

### Key Capabilities
1. **Multi-Page & Multi-Viewport Visual Crawler:** Crawls `1–10` internal pages sequentially across Desktop, Tablet, and Mobile viewports.
2. **Deterministic DOM & WCAG 2.2 AA Probe (`dom-probe.ts`):** Measures exact text-to-background luminance contrast ratios (`< 4.5:1`), flags mobile touch targets smaller than `44×44px`, detects horizontal overflow culprits, and checks above-the-fold CTA prominence.
3. **Competitor Design Token Spy:** Extracts any competitor's live HEX color palette, computed typography scale (`H1`–`H6`, `p`, `button`), spacing grid values, border radii, and `:root` CSS variables—and exports them directly into a reusable **`SKILL.md`** file for Claude Code.
4. **Authenticated Session Auditing:** Supports persistent Chromium login profiles (`data/browser-profile`) and a `Headed Browser` mode so you can log into gated SaaS dashboards, staging sites, or checkout flows once and audit behind login walls.
5. **Dual AI Modes (API Mode + Zero-API-Key Mode):**
   - **Vision API Mode:** Connects to Anthropic Claude Vision to combine screenshots with DOM measurements.
   - **Zero-API Bundle Mode:** Generates a 1-click copyable prompt + telemetry bundle so you can run deep audits inside your existing Claude, ChatGPT, or Gemini web subscription at zero API cost.
6. **Low-RAM Hardware Optimized:** Sequential single-tab execution with memory-capped Chromium flags (`--max-old-space-size=512`, `--disable-gpu`) and zero background database daemons—runs smoothly on 4GB–8GB RAM laptops.

---

## System Architecture

```text
+-----------------------------------------------------------------------------------+
|                   OMNIAUDIT WORKBENCH UI (http://localhost:3000)                  |
|  [ Target URL ]  [ Max Pages: 1-10 ]  [ Viewports: D/T/M ]  [ Mode: Audit / Spy ] |
+-----------------------------------------+-----------------------------------------+
                                          | POST /api/audit
                                          v
+-----------------------------------------------------------------------------------+
|                     PLAYWRIGHT BROWSER AUTOMATION ENGINE                          |
|  1. Crawl Internal Links (up to N pages) & Scroll Full Page (trigger lazy images) |
|  2. Capture Full-Page + Above-the-Fold PNGs across Desktop (1440) & Mobile (375)  |
|  3. Inject `dom-probe.ts` into Browser Context -> Extract Hard UI/UX Telemetry:   |
|     - Computed Typography Scale, Hex Color Palette, CSS Variables & Spacing Grid  |
|     - WCAG Contrast Ratios, Tap Targets (<44x44px), Horizontal Overflow Elements  |
|     - Console Errors, Broken Links/Images (404s), Heading Hierarchy (H1-H6)       |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        v                                 v                                 v
+-------------------------------+ +-------------------------------+ +---------------+
|  1. Interactive Split-Pane UI | |  2. Raw `website-audit.md`    | | 3. Competitor |
|  Annotated Fold Line & Filter | |  (Exhaustive findings ready   | | `SKILL.md`    |
|  Table by Severity & Domain   | |  to feed into Claude Code)    | | Token Spy     |
+-------------------------------+ +-------------------------------+ +---------------+
```

---

## Quick Start & Local Installation

### Prerequisites
- **Node.js** `v18.17+` or `v20+`
- **npm** (or `pnpm` / `yarn`)

### 1. Clone the Repository
```bash
git clone https://github.com/Enzer-byte/OmniAudit-Studio.git
cd OmniAudit-Studio
```

### 2. Install Dependencies & Chromium Binary
```bash
npm install
npx playwright install chromium
```

### 3. (Optional) Configure Environment Variables
If you want automatic in-app Vision AI enrichment, copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
*(You can also leave `.env.local` empty and paste an API key in the top navbar UI, or use the **Zero-API Prompt Bundle** button for free.)*

### 4. Launch the Workbench
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## How to Use & Implement OmniAudit Studio in Your Web Design Workflow

### Workflow 1: Auditing a Client or Prospect Website (`Full UI/UX + CRO Audit` Mode)
1. Enter the target URL (e.g., `https://example.com`) and select **Max Pages** (`1` to `10`).
2. Select **Desktop (`1440px`)** and **Mobile (`375px`)** viewports.
3. Click **Run Audit**.
4. Inspect the **Left Pane** to review full-page screenshots with the **Above-the-Fold (`900px` / `812px`) indicator line**.
5. Use the **Right Pane** tabs to filter findings by severity (`Blocker`, `High`, `Medium`, `Low`) across 10 audit domains:
   - Visual Hierarchy & Layout
   - Typography & Scannability
   - Color & Contrast (WCAG 2.2 AA)
   - Navigation & Information Architecture
   - CRO & Above-the-Fold Clarity
   - Copywriting & Messaging
   - Trust & Social Proof
   - Mobile UX & Touch Ergonomics (`< 44×44px` tap targets & horizontal overflow)
   - Accessibility & DOM Health (broken 404 assets & missing `alt` attributes)
   - AI-Slop Detection
6. Navigate to **Tab 4 (`Export Markdown & Claude Skills`)**:
   - Click **Download Polished Client Executive Report (`.md`)** to get a clean, client-ready summary with a 0–100 scorecard and prioritized roadmap.
   - Click **Download Raw `website-audit.md`** to feed the complete technical audit into your AI coding agent.

---

### Workflow 2: Extracting Competitor Design Systems (`Competitor Token Spy` Mode)
Want your AI coding assistant to design with the exact restraint, typography scale, and color polarity of a top industry site?
1. Enter the benchmark website URL and switch **Mode** to **Competitor Token Spy**.
2. Click **Run Audit** and open **Tab 2 (`Competitor Design Token Spy`)** to view and copy live HEX swatches and computed typography tables.
3. Open **Tab 4 (`Export Markdown & Claude Skills`)** and click **Download Extracted Brand Guardrails `SKILL.md`**.
4. Place the downloaded `SKILL.md` inside your project's `.claude/skills/brand-guardrails/SKILL.md` folder. Now Claude Code or OpenCode will automatically enforce those design tokens and anti-AI-slop rules whenever it builds UI components.

---

### Workflow 3: Auditing Password-Protected Apps & Dashboards
1. Check both **Headed Browser** and **Saved Login Profile** in the top control bar.
2. Enter the login URL of the web app and click **Run Audit**.
3. A visible Chromium window will open. Log into your account manually. Your session cookies are saved locally inside `./data/browser-profile/`.
4. On future runs, uncheck **Headed Browser** while keeping **Saved Login Profile** checked—OmniAudit Studio will silently audit authenticated dashboard pages in headless mode.

---

## Bonus: Standalone 5-Second Chrome DevTools Console Probe

Need a quick DOM telemetry check without starting the local server? Open any website in Chrome, press `Cmd+Option+I` (`Ctrl+Shift+I` on Windows) -> **Console**, and paste:

```javascript
(() => {
  const res = {
    url: location.href,
    viewport: `${ innerWidth }x${ innerHeight }`,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    tinyTapTargets: [],
    typographyScale: {}
  };
  document.querySelectorAll('a,button,input,[role="button"]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44))
      res.tinyTapTargets.push({ tag: el.tagName, text: (el.innerText || '').slice(0, 25).trim(), size: `${Math.round(r.width)}x${Math.round(r.height)}px` });
  });
  ['h1','h2','h3','p','button'].forEach(t => {
    const el = document.querySelector(t);
    if (el) {
      const s = getComputedStyle(el);
      res.typographyScale[t] = { font: s.fontFamily.split(',')[0], size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight };
    }
  });
  console.table(res.typographyScale);
  console.log('UI/UX Telemetry:', res);
  return res;
})();
```

---

## Security & Privacy Notes
- **100% Local Data Storage:** All screenshots (`public/audits/`) and JSON reports (`data/audits/`) stay on your local disk and are excluded from Git via `.gitignore`.
- **Never Commit Browser Profiles:** The `data/browser-profile/` directory contains session cookies for authenticated audits and is strictly ignored by `.gitignore`.

## License
MIT License — free for personal, freelance, and agency use.
