import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { runPlaywrightCrawl } from '@/lib/auditor';
import { buildZeroApiPromptBundle, synthesizeAuditFindings } from '@/lib/ai-analyzer';
import {
  generateClientExecutiveReportMarkdown,
  generateCompetitorGuardrailsSkill,
  generateRawWebsiteAuditMarkdown,
} from '@/lib/skill-generator';
import { CompleteAuditRun, ViewportName } from '@/types/audit';

const DATA_DIR = path.join(process.cwd(), 'data', 'audits');

export async function GET() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const files = await fs.readdir(DATA_DIR);
    const audits: CompleteAuditRun[] = [];
    for (const file of files.filter((f) => f.endsWith('.json')).slice(-15)) {
      const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
      audits.push(JSON.parse(raw));
    }
    audits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ audits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const targetUrl: string = body.url?.startsWith('http') ? body.url : `https://${body.url}`;
    const maxPages: number = Math.min(Math.max(Number(body.maxPages) || 3, 1), 10);
    const viewports: ViewportName[] = body.viewports?.length ? body.viewports : ['desktop', 'mobile'];
    const mode: 'full-audit' | 'competitor-spy' = body.mode || 'full-audit';
    const headed = Boolean(body.headed);
    const usePersistentSession = Boolean(body.usePersistentSession);
    const anthropicKey: string | undefined = body.anthropicKey;

    const auditId = `${new URL(targetUrl).hostname.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`;

    const pages = await runPlaywrightCrawl({
      auditId,
      seedUrl: targetUrl,
      maxPages,
      viewports,
      headed,
      usePersistentSession,
    });

    const { findings, scores, executiveSummary } = await synthesizeAuditFindings(targetUrl, pages, anthropicKey);

    for (const p of pages) {
      for (const c of p.captures) {
        delete c.aboveFoldBase64;
      }
    }

    const rawWebsiteAuditMd = generateRawWebsiteAuditMarkdown(targetUrl, pages, findings);
    const clientReportMd = generateClientExecutiveReportMarkdown(targetUrl, executiveSummary, scores, findings);
    const competitorSkillMd = generateCompetitorGuardrailsSkill(targetUrl, pages);
    const zeroApiPromptBundle = buildZeroApiPromptBundle(targetUrl, pages);

    const completeRun: CompleteAuditRun = {
      id: auditId,
      targetUrl,
      createdAt: new Date().toISOString(),
      durationSeconds: Number(((Date.now() - startTime) / 1000).toFixed(1)),
      mode,
      scores,
      executiveSummary,
      pages,
      findings,
      rawWebsiteAuditMd,
      clientReportMd,
      competitorSkillMd,
      zeroApiPromptBundle,
    };

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${auditId}.json`), JSON.stringify(completeRun, null, 2), 'utf-8');

    return NextResponse.json({ audit: completeRun });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Audit failed' }, { status: 500 });
  }
}
