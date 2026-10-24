import { AuditFinding, CrawledPageReport } from '@/types/audit';

export function generateCompetitorGuardrailsSkill(targetUrl: string, pages: CrawledPageReport[]): string {
  const primaryCapture = pages[0]?.captures[0]?.domTelemetry;
  if (!primaryCapture) return '# No telemetry captured';

  const colors = primaryCapture.designTokens.colors
    .map((c) => `- \`${c.hex}\` (${c.roleHint} — observed ${c.count}x)`)
    .join('\n');

  const typeScale = primaryCapture.designTokens.typographyScale
    .map(
      (t) =>
        `| \`<${t.tag}>\` | \`${t.fontFamily}\` | \`${t.fontSize}\` | \`${t.fontWeight}\` | \`${t.lineHeight}\` | \`${t.color}\` |`
    )
    .join('\n');

  const cssVars = Object.entries(primaryCapture.designTokens.cssVariables)
    .slice(0, 15)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  return `---
name: brand-guardrails-${new URL(targetUrl).hostname.replace(/\./g, '-')}
description: Extracted UI/UX design system tokens and structural guardrails from ${targetUrl}. Load before building or refining any web section.
---

# Brand & UI System Guardrails (Extracted via OmniAudit Studio)

## 1. Visual North Star & Source Reference
- **Reference Benchmark:** ${targetUrl}
- **Rule:** Translate composition, spacing rhythm, and typographic restraint; never copy brand logos or proprietary copy 1:1.

## 2. Extracted Color Palette Tokens
${colors}

## 3. Computed Typography Scale
| Element | Font Family | Size | Weight | Line Height | Computed Color |
| :--- | :--- | :--- | :--- | :--- | :--- |
${typeScale}

## 4. Layout, Spacing & Surface Rhythm
- **Detected Spacing Grid Values:** ${primaryCapture.designTokens.spacingValues.join(', ') || '8px / 16px / 24px / 48px'}
- **Border Radius Tokens:** ${primaryCapture.designTokens.borderRadii.join(', ') || '6px / 12px'}
- **Elevation / Box Shadows:** ${primaryCapture.designTokens.boxShadows.join(' | ') || 'Subtle 1px solid hairline borders'}

## 5. Root CSS Custom Properties
\`\`\`css
:root {
${cssVars || '  /* No explicit --root variables exposed; use hex tokens above */'}
}
\`\`\`

## 6. Anti-AI-Slop Enforcement Rules
1. Never use generic 3-column centered icon-circle cards.
2. Maintain WCAG 2.2 AA contrast (>= 4.5:1 on body text, >= 3.0:1 on headings).
3. Ensure all mobile interactive tap targets measure at least \`44x44px\`.
`;
}

export function generateRawWebsiteAuditMarkdown(
  targetUrl: string,
  pages: CrawledPageReport[],
  findings: AuditFinding[]
): string {
  const pageTelemetryBlocks = pages
    .map((p) => {
      const capBlocks = p.captures
        .map((c) => {
          const d = c.domTelemetry;
          return `### Viewport: ${c.viewport.name.toUpperCase()} (${c.viewport.width}x${c.viewport.height})
- **Horizontal Overflow:** ${d.hasHorizontalOverflow ? `YES (${d.overflowCulprits.length} offending nodes)` : 'None'}
- **Above-the-Fold Primary CTA:** ${
            d.aboveTheFoldCTA
              ? `"${d.aboveTheFoldCTA.text}" (\`${d.aboveTheFoldCTA.selector}\`) at (${d.aboveTheFoldCTA.x}, ${d.aboveTheFoldCTA.y}) — Contrast: ${d.aboveTheFoldCTA.contrastRatio}:1`
              : 'MISSING ABOVE THE FOLD'
          }
- **WCAG Contrast Failures:** ${d.contrastViolations.length}
- **Sub-44px Tap Targets:** ${d.tapTargetViolations.length}
- **Missing Alt Attributes:** ${d.missingAltImages.length}
- **Broken Images:** ${d.brokenImages.length}`;
        })
        .join('\n\n');

      return `## Page: ${p.url}
- **Console Errors:** ${p.consoleErrors.length}
- **Broken Network Assets (4xx/5xx):** ${p.brokenNetworkAssets.length}

${capBlocks}`;
    })
    .join('\n\n---\n\n');

  const findingRows = findings
    .map(
      (f) => `### [${f.severity.toUpperCase()}] ${f.id} — ${f.domain}
- **Page & Viewport:** \`${f.pageUrl}\` (${f.viewport})
- **Location / Selector:** \`${f.selectorOrLocation}\`
- **Observation:** ${f.observation}
- **Measured Evidence:** ${f.measuredEvidence}
- **Business / UX Impact:** ${f.impact}
- **Recommended Fix:** ${f.actionableFix}`
    )
    .join('\n\n');

  return `# RAW COMPREHENSIVE WEBSITE AUDIT (website-audit.md)
**Target URL:** ${targetUrl}
**Generated:** ${new Date().toISOString()}
**Total Findings:** ${findings.length}

---

# PART 1: HARD DOM & VIEWPORT TELEMETRY
${pageTelemetryBlocks}

---

# PART 2: EXHAUSTIVE UI/UX, CRO & ACCESSIBILITY FINDINGS
${findingRows}
`;
}

export function generateClientExecutiveReportMarkdown(
  targetUrl: string,
  executiveSummary: string,
  scores: { overall: number; visualCraft: number; croReadiness: number; mobileUx: number; accessibility: number },
  findings: AuditFinding[]
): string {
  const blockersAndHigh = findings.filter((f) => f.severity === 'Blocker' || f.severity === 'High').slice(0, 10);

  const priorityTable = blockersAndHigh
    .map(
      (f, idx) =>
        `| ${idx + 1} | **${f.severity}** | ${f.domain} | ${f.observation} | ${f.actionableFix} |`
    )
    .join('\n');

  return `# Website Experience & Conversion Audit Report
**Prepared For:** ${targetUrl}  
**Date:** ${new Date().toLocaleDateString()}

---

## 1. Executive Summary
${executiveSummary}

## 2. Benchmark Scorecard
| Audit Dimension | Score (0–100) | Status |
| :--- | :--- | :--- |
| **Overall Experience Score** | **${scores.overall}/100** | ${scores.overall >= 75 ? 'Strong' : 'Needs Strategic Overhaul'} |
| **Visual Craft & Brand Authority** | ${scores.visualCraft}/100 | ${scores.visualCraft >= 75 ? 'Healthy' : 'Opportunity'} |
| **Lead Gen & CRO Readiness** | ${scores.croReadiness}/100 | ${scores.croReadiness >= 75 ? 'Optimized' : 'High Friction'} |
| **Mobile Responsiveness & Touch UX** | ${scores.mobileUx}/100 | ${scores.mobileUx >= 75 ? 'Responsive' : 'Layout Friction'} |
| **WCAG 2.2 AA Accessibility** | ${scores.accessibility}/100 | ${scores.accessibility >= 75 ? 'Compliant' : 'At Risk'} |

---

## 3. Top Strategic Priorities & Quick Wins
| # | Priority | Domain | Key Finding | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
${priorityTable}

---

## 4. Recommended Next Steps (3-Phase Rollout)
1. **Phase 1 — Immediate Conversion & Accessibility Fixes (Days 1–3):** Resolve above-the-fold CTA contrast, fix mobile horizontal overflow, and expand sub-44px tap targets.
2. **Phase 2 — Visual Direction & Brand Guardrails (Days 4–7):** Establish unified typography scale, bespoke proof components, and high-trust case study modules.
3. **Phase 3 — Section-by-Section Redesign & Automated QA (Weeks 2–3):** Rebuild core landing experiences and validate against automated Playwright regression checks.
`;
}
