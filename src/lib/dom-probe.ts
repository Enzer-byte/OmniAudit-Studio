import { DomProbeResult } from '@/types/audit';

export const DOM_PROBE_SCRIPT = (): DomProbeResult => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const getSelector = (el: Element): string => {
    if (el.id) return `#${el.id}`;
    const tag = el.tagName.toLowerCase();
    const cls = Array.from(el.classList)
      .filter((c) => !c.includes(':') && c.length < 24)
      .slice(0, 2)
      .join('.');
    return cls ? `${tag}.${cls}` : tag;
  };

  const parseRgba = (colorStr: string): [number, number, number, number] | null => {
    const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] !== undefined ? Number(m[4]) : 1];
  };

  const rgbToHex = (r: number, g: number, b: number): string =>
    '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();

  const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
  };

  const getEffectiveBgRgb = (el: Element | null): [number, number, number] => {
    let curr: Element | null = el;
    while (curr && curr !== document.documentElement) {
      const bg = window.getComputedStyle(curr).backgroundColor;
      const parsed = parseRgba(bg);
      if (parsed && parsed[3] > 0.1) {
        return [parsed[0], parsed[1], parsed[2]];
      }
      curr = curr.parentElement;
    }
    const bodyBg = parseRgba(window.getComputedStyle(document.body).backgroundColor);
    if (bodyBg && bodyBg[3] > 0.1) return [bodyBg[0], bodyBg[1], bodyBg[2]];
    return [255, 255, 255];
  };

  const colorCounts: Record<string, { count: number; roleHint: string }> = {};
  const fontSet = new Set<string>();
  const spacingSet = new Set<string>();
  const radiusSet = new Set<string>();
  const shadowSet = new Set<string>();
  const contrastViolations: DomProbeResult['contrastViolations'] = [];
  const overflowCulprits: DomProbeResult['overflowCulprits'] = [];

  const allElements = Array.from(document.querySelectorAll('body *'));

  for (const el of allElements) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;

    if (rect.right > vw + 2 && overflowCulprits.length < 15) {
      overflowCulprits.push({
        selector: getSelector(el),
        rightEdgePx: Math.round(rect.right),
        viewportWidth: vw,
        overflowAmountPx: Math.round(rect.right - vw),
      });
    }

    for (const [prop, hint] of [
      ['backgroundColor', 'Surface/Background'],
      ['color', 'Text/Foreground'],
      ['borderColor', 'Border/Hairline'],
    ] as const) {
      const parsed = parseRgba(style[prop]);
      if (parsed && parsed[3] > 0.15) {
        const hex = rgbToHex(parsed[0], parsed[1], parsed[2]);
        if (!colorCounts[hex]) colorCounts[hex] = { count: 0, roleHint: hint };
        colorCounts[hex].count += 1;
      }
    }

    const primaryFont = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (primaryFont) fontSet.add(primaryFont);
    if (style.padding && style.padding !== '0px') spacingSet.add(style.padding);
    if (style.gap && style.gap !== 'normal' && style.gap !== '0px') spacingSet.add(style.gap);
    if (style.borderRadius && style.borderRadius !== '0px') radiusSet.add(style.borderRadius);
    if (style.boxShadow && style.boxShadow !== 'none') shadowSet.add(style.boxShadow.slice(0, 60));

    const directText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent?.trim() || '')
      .join(' ')
      .trim();

    if (directText.length > 2 && contrastViolations.length < 25) {
      const fg = parseRgba(style.color);
      if (fg && fg[3] > 0.2) {
        const bg = getEffectiveBgRgb(el);
        const ratio = getContrastRatio([fg[0], fg[1], fg[2]], bg);
        const fontSizePx = parseFloat(style.fontSize);
        const isBold = parseInt(style.fontWeight, 10) >= 700;
        const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && isBold);
        const requiredRatio = isLargeText ? 3.0 : 4.5;

        if (ratio < requiredRatio) {
          contrastViolations.push({
            selector: getSelector(el),
            text: directText.slice(0, 50),
            textColor: rgbToHex(fg[0], fg[1], fg[2]),
            bgColor: rgbToHex(bg[0], bg[1], bg[2]),
            ratio,
            requiredRatio,
            fontSize: `${Math.round(fontSizePx)}px`,
          });
        }
      }
    }
  }

  const tapTargetViolations: DomProbeResult['tapTargetViolations'] = [];
  const interactives = Array.from(
    document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]')
  );

  for (const el of interactives) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if ((rect.width < 44 || rect.height < 44) && tapTargetViolations.length < 30) {
      const label = (
        (el as HTMLElement).innerText ||
        el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.getAttribute('href') ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40);

      tapTargetViolations.push({
        selector: getSelector(el),
        tag: el.tagName.toLowerCase(),
        text: label || '(Unlabeled Control)',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
      });
    }
  }

  let aboveTheFoldCTA: DomProbeResult['aboveTheFoldCTA'] = null;
  const ctaCandidates = interactives.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= vh && r.width >= 80 && r.height >= 32;
  });

  if (ctaCandidates.length > 0) {
    const scored = ctaCandidates.map((el) => {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      const bg = parseRgba(s.backgroundColor);
      const hasSolidBg = bg && bg[3] > 0.5 && rgbToHex(bg[0], bg[1], bg[2]) !== '#FFFFFF';
      const inMain = Boolean(el.closest('main, header, section'));
      const score = (hasSolidBg ? 50 : 0) + (inMain ? 20 : 0) + (r.top > 90 ? 25 : 0);
      return { el, r, s, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const fg = parseRgba(best.s.color) || [0, 0, 0, 1];
    const bg = getEffectiveBgRgb(best.el);

    aboveTheFoldCTA = {
      found: true,
      text: ((best.el as HTMLElement).innerText || '').trim().slice(0, 40),
      selector: getSelector(best.el),
      x: Math.round(best.r.left),
      y: Math.round(best.r.top),
      width: Math.round(best.r.width),
      height: Math.round(best.r.height),
      bgColor: rgbToHex(bg[0], bg[1], bg[2]),
      textColor: rgbToHex(fg[0], fg[1], fg[2]),
      contrastRatio: getContrastRatio([fg[0], fg[1], fg[2]], bg),
    };
  }

  const typographyScale: DomProbeResult['designTokens']['typographyScale'] = [];
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'p', 'a', 'button']) {
    const el = document.querySelector(tag);
    if (!el) continue;
    const s = window.getComputedStyle(el);
    const fg = parseRgba(s.color);
    typographyScale.push({
      tag,
      fontFamily: s.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      color: fg ? rgbToHex(fg[0], fg[1], fg[2]) : s.color,
    });
  }

  const cssVariables: Record<string, string> = {};
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSStyleRule && (rule.selectorText === ':root' || rule.selectorText === 'html')) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--') && Object.keys(cssVariables).length < 40) {
                cssVariables[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch {}
    }
  } catch {}

  const headingOutline = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .slice(0, 30)
    .map((h) => ({
      level: h.tagName.toUpperCase(),
      text: (h as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 80),
    }));

  const missingAltImages: DomProbeResult['missingAltImages'] = [];
  const brokenImages: DomProbeResult['brokenImages'] = [];
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '') {
      missingAltImages.push({ src: img.currentSrc || img.src, selector: getSelector(img) });
    }
    if (img.complete && img.naturalWidth === 0) {
      brokenImages.push({ src: img.currentSrc || img.src, selector: getSelector(img) });
    }
  });

  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 14)
    .map(([hex, data]) => ({ hex, count: data.count, roleHint: data.roleHint }));

  return {
    url: window.location.href,
    title: document.title || '(Untitled Page)',
    metaDescription:
      document.querySelector('meta[name="description"]')?.getAttribute('content') || '(Missing Meta Description)',
    viewport: { width: vw, height: vh },
    hasHorizontalOverflow: document.documentElement.scrollWidth > vw + 2,
    overflowCulprits,
    aboveTheFoldCTA,
    contrastViolations,
    tapTargetViolations,
    headingOutline,
    missingAltImages: missingAltImages.slice(0, 20),
    brokenImages: brokenImages.slice(0, 20),
    designTokens: {
      colors: sortedColors,
      fonts: Array.from(fontSet).slice(0, 6),
      typographyScale,
      spacingValues: Array.from(spacingSet).slice(0, 12),
      borderRadii: Array.from(radiusSet).slice(0, 8),
      boxShadows: Array.from(shadowSet).slice(0, 6),
      cssVariables,
    },
  };
};
