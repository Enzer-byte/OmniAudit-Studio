import Anthropic from '@anthropic-ai/sdk';
import { AuditFinding, CrawledPageReport } from '@/types/audit';

export function buildZeroApiPromptBundle(targetUrl: string, pages: CrawledPageReport[]): string {
  const compactTelemetry = pages.map((p) => ({
    url: p.url,
    consoleErrors: p.consoleErrors,
    brokenNetworkAssets: p.brokenNetworkAssets,
    viewports: p.captures.map((c) => ({
      viewport: `${c.viewport.name} (${c.viewport.width}x${c.viewport.height})`,
      hasHorizontalOverflow: c.domTelemetry.hasHorizontalOverflow,
      overflowCulprits: c.domTelemetry.overflowCulprits,
      aboveTheFoldCTA: c.domTelemetry.aboveTheFoldCTA,
      contrastViolationsCount: c.domTelemetry.contrastViolations.length,
      contrastViolationsSample: c.domTelemetry.contrastViolations.slice(0, 8),
      tapTargetViolationsCount: c.domTelemetry.tapTargetViolations.length,
      tapTargetViolationsSample: c.domTelemetry.tapTargetViolations.slice(0, 8),
      headingOutline: c.domTelemetry.headingOutline,
      designTokens: c.domTelemetry.designTokens,
    })),
  }));

  return `# SYSTEM INSTRUCTION FOR CLAUDE CODE / OPUS / GEMINI PRO
You are my Senior Web Design Partner, Principal UX Researcher, and Conversion Rate Optimization (CRO) Architect.
I have run my local Playwright DOM & Visual Telemetry Crawler on **${targetUrl}**.

Using the attached viewport screenshots AND the deterministic DOM telemetry JSON below, produce an exhaustive, unvarnished **60 to 120 finding website audit** (\`website-audit.md\`) across all 10 domains:
1. Visual Hierarchy & Layout Rhythm
2. Typography & Scannability
3. Color System & Contrast Polarity
4. Navigation & Information Architecture
5. Conversion Rate Optimization (CRO) & Above-the-Fold Clarity
6. Copywriting, Messaging & Tone
7. Trust Signals, Social Proof & Authority
8. Mobile Responsiveness & Touch Ergonomics
9. Accessibility (WCAG 2.2 AA) & DOM Health
10. AI-Slop Detection (generic 3-col grids, fake gradients, buzzword copy)

## DETERMINISTIC DOM TELEMETRY JSON
\`\`\`json
${JSON.stringify(compactTelemetry, null, 2)}
\`\`\`
`;
}

export async function synthesizeAuditFindings(
  targetUrl: string,
  pages: CrawledPageReport[],
  anthropicKey?: string
): Promise<{
  findings: AuditFinding[];
  scores: { overall: number; visualCraft: number; croReadiness: number; mobileUx: number; accessibility: number };
  executiveSummary: string;
}> {
  const findings: AuditFinding[] = [];
  let counter = 1;

  for (const page of pages) {
    if (page.brokenNetworkAssets.length > 0) {
      findings.push({
        id: `DOM-${String(counter++).padStart(2, '0')}`,
        severity: 'High',
        domain: 'Accessibility & DOM',
        pageUrl: page.path,
        viewport: 'All Viewports',
        selectorOrLocation: page.brokenNetworkAssets[0].url,
        observation: `${page.brokenNetworkAssets.length} network assets returned HTTP 4xx/5xx status codes.`,
        measuredEvidence: `First failing asset: ${page.brokenNetworkAssets[0].url} (HTTP ${page.brokenNetworkAssets[0].status})`,
        impact: 'Broken images, fonts, or scripts degrade visual trust and hurt page load performance.',
        actionableFix: 'Remove dead asset references or restore missing static files on the CDN.',
      });
    }

    for (const cap of page.captures) {
      const d = cap.domTelemetry;
      const vpLabel = `${cap.viewport.name} (${cap.viewport.width}px)`;

      if (!d.aboveTheFoldCTA) {
        findings.push({
          id: `CRO-${String(counter++).padStart(2, '0')}`,
          severity: 'Blocker',
          domain: 'CRO & Above-the-Fold',
          pageUrl: page.path,
          viewport: vpLabel,
          selectorOrLocation: 'Hero / Above-the-Fold (0px - ' + cap.viewport.height + 'px)',
          observation: 'No prominent primary Call-to-Action button detected above the fold.',
          measuredEvidence: `0 buttons >= 80x32px found within top ${cap.viewport.height}px viewport window.`,
          impact: 'Visitors must scroll before taking action, significantly increasing bounce rate.',
          actionableFix:
            'Add a high-contrast primary CTA button directly inside the Hero container above ' +
            cap.viewport.height +
            'px.',
          pinCoordinates: { x: Math.round(cap.viewport.width * 0.25), y: 380 },
        });
      } else if (d.aboveTheFoldCTA.contrastRatio < 4.5) {
        findings.push({
          id: `CRO-${String(counter++).padStart(2, '0')}`,
          severity: 'Blocker',
          domain: 'CRO & Above-the-Fold',
          pageUrl: page.path,
          viewport: vpLabel,
          selectorOrLocation: d.aboveTheFoldCTA.selector,
          observation: `Primary Hero CTA ("${d.aboveTheFoldCTA.text}") has low text contrast against its button fill.`,
          measuredEvidence: `Measured contrast ratio: ${d.aboveTheFoldCTA.contrastRatio}:1 (${d.aboveTheFoldCTA.textColor} on ${d.aboveTheFoldCTA.bgColor}) — fails 4.5:1 standard.`,
          impact: 'Primary conversion action blends into the background and fails WCAG 2.2 AA readability.',
          actionableFix: `Update ${d.aboveTheFoldCTA.selector} background/text color pair to achieve at least 4.5:1 contrast.`,
          pinCoordinates: { x: d.aboveTheFoldCTA.x, y: d.aboveTheFoldCTA.y },
        });
      }

      if (d.hasHorizontalOverflow && d.overflowCulprits.length > 0) {
        const worst = d.overflowCulprits[0];
        findings.push({
          id: `MOB-${String(counter++).padStart(2, '0')}`,
          severity: 'Blocker',
          domain: 'Mobile UX & Ergonomics',
          pageUrl: page.path,
          viewport: vpLabel,
          selectorOrLocation: worst.selector,
          observation: 'Page suffers from unintended horizontal scroll overflow.',
          measuredEvidence: `Element ${worst.selector} extends to ${worst.rightEdgePx}px (${worst.overflowAmountPx}px wider than ${worst.viewportWidth}px viewport).`,
          impact: 'Breaks mobile swipe ergonomics and makes the entire layout feel broken on smartphones.',
          actionableFix: `Apply max-w-full overflow-x-hidden or responsive flex-wrap to ${worst.selector}.`,
          pinCoordinates: { x: cap.viewport.width - 30, y: 220 },
        });
      }

      for (const cv of d.contrastViolations.slice(0, 6)) {
        findings.push({
          id: `CLR-${String(counter++).padStart(2, '0')}`,
          severity: cv.ratio < 3.0 ? 'High' : 'Medium',
          domain: 'Color & Contrast',
          pageUrl: page.path,
          viewport: vpLabel,
          selectorOrLocation: cv.selector,
          observation: `Text snippet "${cv.text}" fails WCAG 2.2 AA contrast threshold.`,
          measuredEvidence: `Ratio ${cv.ratio}:1 (${cv.textColor} on ${cv.bgColor} at ${cv.fontSize}) — required >= ${cv.requiredRatio}:1.`,
          impact: 'Strains eye readability for users in bright environments or with low vision.',
          actionableFix: `Darken text color or adjust surface background on ${cv.selector} to reach ${cv.requiredRatio}:1.`,
        });
      }

      if (cap.viewport.name === 'mobile' && d.tapTargetViolations.length > 0) {
        for (const tt of d.tapTargetViolations.slice(0, 5)) {
          findings.push({
            id: `UX-${String(counter++).padStart(2, '0')}`,
            severity: 'Medium',
            domain: 'Mobile UX & Ergonomics',
            pageUrl: page.path,
            viewport: vpLabel,
            selectorOrLocation: tt.selector,
            observation: `Interactive control "${tt.text}" has a touch target smaller than 44x44px.`,
            measuredEvidence: `Measured bounding box: ${tt.width}x${tt.height}px at (${tt.x}, ${tt.y}).`,
            impact: 'Causes fat-finger mis-taps and mobile navigation frustration.',
            actionableFix: `Add min-h-[44px] min-w-[44px] inline-flex items-center to ${tt.selector}.`,
            pinCoordinates: { x: Math.min(tt.x, 340), y: tt.y },
          });
        }
      }
    }
  }

  const apiKey = anthropicKey || process.env.ANTHROPIC_API_KEY;
  if (apiKey && pages[0]?.captures[0]?.aboveFoldBase64) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const firstCap = pages[0].captures[0];

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: firstCap.aboveFoldBase64!,
                },
              },
              {
                type: 'text',
                text: `You are a Principal UI/UX & CRO Auditor. Inspect this screenshot of ${targetUrl} alongside its extracted typography (${JSON.stringify(
                  firstCap.domTelemetry.designTokens.typographyScale
                )}). Return ONLY a valid JSON array of 6 high-impact visual/UX/CRO/AI-Slop findings matching this interface:
[{"severity":"High","domain":"Visual Hierarchy & Layout","selectorOrLocation":"Hero Section","observation":"...","measuredEvidence":"Visual inspection","impact":"...","actionableFix":"..."}]`,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const aiItems = JSON.parse(jsonMatch[0]);
          for (const item of aiItems) {
            findings.unshift({
              id: `VIS-${String(counter++).padStart(2, '0')}`,
              severity: item.severity || 'High',
              domain: item.domain || 'Visual Hierarchy & Layout',
              pageUrl: pages[0].path,
              viewport: 'desktop (1440px)',
              selectorOrLocation: item.selectorOrLocation || 'Above the Fold',
              observation: item.observation,
              measuredEvidence: item.measuredEvidence || 'Claude Vision Analysis',
              impact: item.impact,
              actionableFix: item.actionableFix,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Vision API enrichment skipped or failed, using deterministic DOM findings:', err);
    }
  }

  const blockerCount = findings.filter((f) => f.severity === 'Blocker').length;
  const highCount = findings.filter((f) => f.severity === 'High').length;
  const medCount = findings.filter((f) => f.severity === 'Medium').length;

  const penalty = blockerCount * 11 + highCount * 5 + medCount * 2;
  const overall = Math.max(28, Math.min(96, 95 - penalty));
  const croReadiness = Math.max(25, Math.min(95, 92 - blockerCount * 15 - highCount * 4));
  const mobileUx = Math.max(30, Math.min(96, 94 - findings.filter((f) => f.domain === 'Mobile UX & Ergonomics').length * 7));
  const accessibility = Math.max(
    30,
    Math.min(96, 95 - findings.filter((f) => f.domain === 'Color & Contrast' || f.domain === 'Accessibility & DOM').length * 5)
  );
  const visualCraft = Math.round((overall + croReadiness) / 2);

  const executiveSummary = `OmniAudit Studio crawled ${pages.length} page(s) on ${targetUrl} and identified ${findings.length} total UI/UX, conversion, and accessibility findings (${blockerCount} Blockers, ${highCount} High-Priority). Key opportunities center on strengthening above-the-fold CTA prominence, resolving WCAG 2.2 AA contrast violations, and tightening mobile touch ergonomics.`;

  return {
    findings,
    scores: { overall, visualCraft, croReadiness, mobileUx, accessibility },
    executiveSummary,
  };
}
