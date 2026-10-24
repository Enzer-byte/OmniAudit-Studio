export type ViewportName = 'desktop' | 'tablet' | 'mobile';

export interface ViewportSpec {
  name: ViewportName;
  width: number;
  height: number;
}

export interface ContrastViolation {
  selector: string;
  text: string;
  textColor: string;
  bgColor: string;
  ratio: number;
  requiredRatio: number;
  fontSize: string;
}

export interface TapTargetViolation {
  selector: string;
  tag: string;
  text: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface OverflowCulprit {
  selector: string;
  rightEdgePx: number;
  viewportWidth: number;
  overflowAmountPx: number;
}

export interface TypographyToken {
  tag: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
}

export interface AboveTheFoldCTA {
  found: boolean;
  text: string;
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: string;
  textColor: string;
  contrastRatio: number;
}

export interface DomProbeResult {
  url: string;
  title: string;
  metaDescription: string;
  viewport: { width: number; height: number };
  hasHorizontalOverflow: boolean;
  overflowCulprits: OverflowCulprit[];
  aboveTheFoldCTA: AboveTheFoldCTA | null;
  contrastViolations: ContrastViolation[];
  tapTargetViolations: TapTargetViolation[];
  headingOutline: { level: string; text: string }[];
  missingAltImages: { src: string; selector: string }[];
  brokenImages: { src: string; selector: string }[];
  designTokens: {
    colors: { hex: string; count: number; roleHint: string }[];
    fonts: string[];
    typographyScale: TypographyToken[];
    spacingValues: string[];
    borderRadii: string[];
    boxShadows: string[];
    cssVariables: Record<string, string>;
  };
}

export interface ViewportCapture {
  viewport: ViewportSpec;
  aboveFoldScreenshotUrl: string;
  fullPageScreenshotUrl: string;
  aboveFoldBase64?: string;
  domTelemetry: DomProbeResult;
}

export interface CrawledPageReport {
  url: string;
  path: string;
  consoleErrors: string[];
  brokenNetworkAssets: { url: string; status: number; type: string }[];
  captures: ViewportCapture[];
}

export interface AuditFinding {
  id: string;
  severity: 'Blocker' | 'High' | 'Medium' | 'Low';
  domain:
    | 'Visual Hierarchy & Layout'
    | 'Typography & Scannability'
    | 'Color & Contrast'
    | 'Navigation & IA'
    | 'CRO & Above-the-Fold'
    | 'Copywriting & Messaging'
    | 'Trust & Social Proof'
    | 'Mobile UX & Ergonomics'
    | 'Accessibility & DOM'
    | 'AI-Slop Detection';
  pageUrl: string;
  viewport: string;
  selectorOrLocation: string;
  observation: string;
  measuredEvidence: string;
  impact: string;
  actionableFix: string;
  pinCoordinates?: { x: number; y: number };
}

export interface CompleteAuditRun {
  id: string;
  targetUrl: string;
  createdAt: string;
  durationSeconds: number;
  mode: 'full-audit' | 'competitor-spy';
  scores: {
    overall: number;
    visualCraft: number;
    croReadiness: number;
    mobileUx: number;
    accessibility: number;
  };
  executiveSummary: string;
  pages: CrawledPageReport[];
  findings: AuditFinding[];
  rawWebsiteAuditMd: string;
  clientReportMd: string;
  competitorSkillMd: string;
  zeroApiPromptBundle: string;
}
