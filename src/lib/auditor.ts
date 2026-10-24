import { chromium, BrowserContext } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { CrawledPageReport, ViewportName, ViewportSpec } from '@/types/audit';
import { DOM_PROBE_SCRIPT } from './dom-probe';

const VIEWPORT_MAP: Record<ViewportName, ViewportSpec> = {
  desktop: { name: 'desktop', width: 1440, height: 900 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  mobile: { name: 'mobile', width: 375, height: 812 },
};

const LOW_RAM_CHROMIUM_ARGS = [
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-extensions',
  '--js-flags=--max-old-space-size=512',
];

export interface CrawlOptions {
  auditId: string;
  seedUrl: string;
  maxPages: number;
  viewports: ViewportName[];
  headed: boolean;
  usePersistentSession: boolean;
}

export async function runPlaywrightCrawl(options: CrawlOptions): Promise<CrawledPageReport[]> {
  const { auditId, seedUrl, maxPages, viewports, headed, usePersistentSession } = options;

  const publicAuditDir = path.join(process.cwd(), 'public', 'audits', auditId);
  const profileDir = path.join(process.cwd(), 'data', 'browser-profile');
  await fs.mkdir(publicAuditDir, { recursive: true });
  await fs.mkdir(profileDir, { recursive: true });

  let context: BrowserContext;
  let browserInstance = null;

  const browserOptions: any = {
    headless: !headed,
    args: LOW_RAM_CHROMIUM_ARGS,
  };
  // Use installed Google Chrome if available (recommended on macOS)
  if (process.platform === 'darwin') {
    browserOptions.channel = 'chrome';
  }

  if (usePersistentSession) {
    try {
      context = await chromium.launchPersistentContext(profileDir, browserOptions);
    } catch {
      delete browserOptions.channel;
      context = await chromium.launchPersistentContext(profileDir, browserOptions);
    }
  } else {
    try {
      browserInstance = await chromium.launch(browserOptions);
    } catch {
      delete browserOptions.channel;
      browserInstance = await chromium.launch(browserOptions);
    }
    context = await browserInstance.newContext();
  }

  const parsedSeed = new URL(seedUrl);
  const visitedUrls = new Set<string>();
  const queue: string[] = [parsedSeed.href];
  const reports: CrawledPageReport[] = [];

  try {
    const page = await context.newPage();

    while (queue.length > 0 && reports.length < maxPages) {
      const currentUrl = queue.shift()!;
      const normalizedUrl = currentUrl.replace(/\/$/, '');
      if (visitedUrls.has(normalizedUrl)) continue;
      visitedUrls.add(normalizedUrl);

      const pageIndex = reports.length + 1;
      const consoleErrors: string[] = [];
      const brokenNetworkAssets: CrawledPageReport['brokenNetworkAssets'] = [];

      const onConsole = (msg: any) => {
        if (msg.type() === 'error' && consoleErrors.length < 20) {
          consoleErrors.push(msg.text().slice(0, 160));
        }
      };

      const onResponse = (res: any) => {
        if (res.status() >= 400 && brokenNetworkAssets.length < 20) {
          brokenNetworkAssets.push({
            url: res.url().slice(0, 120),
            status: res.status(),
            type: res.request().resourceType(),
          });
        }
      };

      page.on('console', onConsole);
      page.on('response', onResponse);

      const captures: CrawledPageReport['captures'] = [];

      for (const vpName of viewports) {
        const vp = VIEWPORT_MAP[vpName];
        await page.setViewportSize({ width: vp.width, height: vp.height });

        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 18000 });
        } catch {
          await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        }

        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let scrolled = 0;
            const maxScroll = Math.min(document.body.scrollHeight, 6000);
            const timer = setInterval(() => {
              window.scrollBy(0, 450);
              scrolled += 450;
              if (scrolled >= maxScroll) {
                clearInterval(timer);
                window.scrollTo(0, 0);
                resolve();
              }
            }, 120);
          });
        });
        await page.waitForTimeout(500);

        if (queue.length < maxPages * 2) {
          const internalLinks = await page.evaluate((origin) => {
            return Array.from(document.querySelectorAll('nav a[href], header a[href], main a[href]'))
              .map((a) => (a as HTMLAnchorElement).href)
              .filter(
                (href) =>
                  href.startsWith(origin) &&
                  !href.includes('#') &&
                  !href.match(/\.(pdf|jpg|png|zip|svg|mailto)$/i)
              );
          }, parsedSeed.origin);

          for (const link of internalLinks) {
            const clean = link.replace(/\/$/, '');
            if (!visitedUrls.has(clean) && !queue.includes(link)) {
              queue.push(link);
            }
          }
        }

        const aboveFoldFile = `page-${pageIndex}-${vp.name}-fold.png`;
        const fullPageFile = `page-${pageIndex}-${vp.name}-full.png`;

        const aboveFoldBuffer = await page.screenshot({
          path: path.join(publicAuditDir, aboveFoldFile),
          fullPage: false,
        });

        await page.screenshot({
          path: path.join(publicAuditDir, fullPageFile),
          fullPage: true,
        });

        const domTelemetry = await page.evaluate(DOM_PROBE_SCRIPT);

        captures.push({
          viewport: vp,
          aboveFoldScreenshotUrl: `/audits/${auditId}/${aboveFoldFile}`,
          fullPageScreenshotUrl: `/audits/${auditId}/${fullPageFile}`,
          aboveFoldBase64: aboveFoldBuffer.toString('base64'),
          domTelemetry,
        });
      }

      page.off('console', onConsole);
      page.off('response', onResponse);

      reports.push({
        url: currentUrl,
        path: new URL(currentUrl).pathname || '/',
        consoleErrors,
        brokenNetworkAssets,
        captures,
      });
    }

    await page.close();
  } finally {
    await context.close();
    if (browserInstance) await browserInstance.close();
  }

  return reports;
}
