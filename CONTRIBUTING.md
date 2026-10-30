# Contributing to OmniAudit Studio

## Pull Request Standard (Matt Pocock Standard)

All pull requests in this repository must adhere to **Matt Pocock's High-Signal, Visual Engineering PR Standard**.

### Core Philosophy
1. **Zero Narrative Prose Preambles:** Do not write long descriptive paragraphs about what your PR does.
2. **Visual Summary First:** Use the smallest, clearest visual structure (Call Tree, Component Tree, Diff-Sketch, Shallow File Tree, or Mermaid Diagram) that immediately communicates the architectural delta.
3. **Concrete Before & After Evidence:** Provide verifiable terminal execution (`npm run build`, `tsc --noEmit`, test output) or screenshot evidence.
4. **Merge Danger Assessment:** Explicitly declare whether the change is a **two-way door** (cheap/safe to revert) or a **one-way door** (destructive / breaking migrations), along with its blast radius.

---

## PR Structure Specification

Every PR must follow this exact format:

```markdown
## Summary

<diagram, diff-sketch, component tree, call tree, or shallow file tree>

## Evidence

- **Before:** <screenshot / failing test run / prior CLI output>
- **After:** <screenshot / passing test run / new CLI output>

## Merge Danger

**Door:** <two-way or one-way>

<optional: description of reversibility>

**Blast Radius:** <Isolated | Leaf Component | API Route | Crawler / Browser Core | System-wide>

<optional: potential ramifications of merge>
```

---

## Visual Summary Formats

Select the format matching your change:

### A. Component Tree (UI Additions & Layout Changes)
```text
<OmniAuditWorkbench> (src/app/page.tsx)
  <ControlBar>
    <ViewportToggle>
    <ModeSelector>
  <SplitPaneViewer>
    <ScreenshotFoldViewer>
    <FindingsInspector>
```

### B. Call Tree (Execution Flow & Pipeline Refactors)
```text
POST /api/audit
  runPlaywrightCrawl
    launchBrowserContext
    crawlPages
      scrollViewport
      captureScreenshots
      injectDomProbe
  synthesizeAuditFindings
  generateArtifacts
    generateRawWebsiteAuditMarkdown
    generateClientExecutiveReportMarkdown
    generateCompetitorGuardrailsSkill
```

### C. Visual Diff-Sketch (Targeted Logic or UI Adjustments)
```diff
 <FindingsInspector>
   <SeverityTabs />
+  <InteractiveBoundingBoxOverlay />
   <FindingCard />
```

### D. Shallow File Tree (New Subsystems or Package Restructuring)
```text
src/lib/
├── auditor.ts          # Playwright low-RAM sequential crawler
├── dom-probe.ts        # Injected in-browser telemetry & WCAG probe
├── ai-analyzer.ts      # Heuristics & Vision AI synthesis
└── skill-generator.ts  # Export formats & SKILL.md generator
```
