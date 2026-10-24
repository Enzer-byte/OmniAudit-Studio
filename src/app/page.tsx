'use client';

import React, { useState } from 'react';
import { CompleteAuditRun, ViewportName } from '@/types/audit';

export default function OmniAuditWorkbench() {
  const [url, setUrl] = useState('https://anthropic.com');
  const [maxPages, setMaxPages] = useState(3);
  const [viewports, setViewports] = useState<ViewportName[]>(['desktop', 'mobile']);
  const [mode, setMode] = useState<'full-audit' | 'competitor-spy'>('full-audit');
  const [headed, setHeaded] = useState(false);
  const [usePersistentSession, setUsePersistentSession] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<CompleteAuditRun | null>(null);

  const [selectedPageIdx, setSelectedPageIdx] = useState(0);
  const [selectedVpIdx, setSelectedVpIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'findings' | 'tokens' | 'dom' | 'exports'>('findings');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const toggleViewport = (vp: ViewportName) => {
    setViewports((prev) => (prev.includes(vp) ? prev.filter((v) => v !== vp) : [...prev, vp]));
  };

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxPages, viewports, mode, headed, usePersistentSession, anthropicKey }),
      });
      const data = await res.json();
      if (data.audit) {
        setAudit(data.audit);
        setSelectedPageIdx(0);
        setSelectedVpIdx(0);
        if (mode === 'competitor-spy') setActiveTab('tokens');
      } else {
        alert(data.error || 'Failed to run audit');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const currentPage = audit?.pages[selectedPageIdx];
  const currentCapture = currentPage?.captures[selectedVpIdx] || currentPage?.captures[0];
  const filteredFindings =
    audit?.findings.filter((f) => severityFilter === 'ALL' || f.severity === severityFilter) || [];

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-[#F5F5F7] font-sans">
      <header className="border-b border-[#3A3A3A] bg-[#262626] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#8AB6D6]" />
          <h1 className="font-semibold tracking-tight text-lg">OMNIAUDIT STUDIO</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-[#333333] text-[#8AB6D6] border border-[#3A3A3A]">
            Local Playwright + Vision UI/UX Engine
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="password"
            placeholder="Optional Anthropic API Key (or use Zero-API tab)"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            className="bg-[#1E1E1E] border border-[#3A3A3A] rounded px-3 py-1 text-xs w-72 text-[#F5F5F7]"
          />
        </div>
      </header>

      <section className="border-b border-[#3A3A3A] bg-[#262626]/60 px-6 py-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">Target Website URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-[#1E1E1E] border border-[#3A3A3A] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#8AB6D6]"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">Max Pages</label>
          <select
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            className="bg-[#1E1E1E] border border-[#3A3A3A] rounded px-3 py-2 text-sm"
          >
            {[1, 2, 3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'Page' : 'Pages'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">Viewports</label>
          <div className="flex gap-1.5">
            {(['desktop', 'tablet', 'mobile'] as ViewportName[]).map((vp) => (
              <button
                key={vp}
                onClick={() => toggleViewport(vp)}
                className={`px-2.5 py-2 rounded text-xs font-medium border ${
                  viewports.includes(vp)
                    ? 'bg-[#8AB6D6]/20 border-[#8AB6D6] text-[#8AB6D6]'
                    : 'bg-[#1E1E1E] border-[#3A3A3A] text-[#A1A1AA]'
                }`}
              >
                {vp.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="bg-[#1E1E1E] border border-[#3A3A3A] rounded px-3 py-2 text-sm"
          >
            <option value="full-audit">Full UI/UX + CRO Audit</option>
            <option value="competitor-spy">Competitor Token Spy</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 pt-3 text-xs text-[#A1A1AA]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={headed} onChange={(e) => setHeaded(e.target.checked)} />
            Headed Browser
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={usePersistentSession}
              onChange={(e) => setUsePersistentSession(e.target.checked)}
            />
            Saved Login Profile
          </label>
        </div>

        <div className="pt-4">
          <button
            onClick={runAudit}
            disabled={loading}
            className="bg-[#8AB6D6] hover:bg-[#A3C7E2] text-[#111111] font-semibold px-5 py-2.5 rounded text-sm transition disabled:opacity-50"
          >
            {loading ? 'Crawling & Inspecting DOM...' : 'Run Audit'}
          </button>
        </div>
      </section>

      {audit && (
        <main className="grid grid-cols-12 h-[calc(100vh-145px)]">
          <div className="col-span-5 border-r border-[#3A3A3A] bg-[#181818] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 gap-2">
              <select
                value={selectedPageIdx}
                onChange={(e) => setSelectedPageIdx(Number(e.target.value))}
                className="bg-[#262626] border border-[#3A3A3A] rounded px-2.5 py-1.5 text-xs flex-1"
              >
                {audit.pages.map((p, idx) => (
                  <option key={p.url} value={idx}>
                    Page {idx + 1}: {p.path}
                  </option>
                ))}
              </select>

              <div className="flex gap-1">
                {currentPage?.captures.map((cap, idx) => (
                  <button
                    key={cap.viewport.name}
                    onClick={() => setSelectedVpIdx(idx)}
                    className={`px-2.5 py-1 rounded text-xs border ${
                      selectedVpIdx === idx
                        ? 'bg-[#8AB6D6] text-[#111111] border-[#8AB6D6] font-semibold'
                        : 'bg-[#262626] text-[#A1A1AA] border-[#3A3A3A]'
                    }`}
                  >
                    {cap.viewport.name} ({cap.viewport.width}px)
                  </button>
                ))}
              </div>
            </div>

            {currentCapture && (
              <div className="relative border border-[#3A3A3A] rounded overflow-hidden bg-[#111111]">
                <img
                  src={currentCapture.fullPageScreenshotUrl}
                  alt="Full page capture"
                  className="w-full h-auto block"
                />
                <div
                  style={{ top: '420px' }}
                  className="absolute left-0 right-0 border-t-2 border-dashed border-red-500/80 pointer-events-none flex justify-end pr-2"
                >
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-b">
                    ABOVE THE FOLD LINE ({currentCapture.viewport.height}px)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-7 bg-[#1E1E1E] p-6 overflow-y-auto">
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Overall Score', val: audit.scores.overall },
                { label: 'Visual Craft', val: audit.scores.visualCraft },
                { label: 'CRO Readiness', val: audit.scores.croReadiness },
                { label: 'Mobile UX', val: audit.scores.mobileUx },
                { label: 'Accessibility', val: audit.scores.accessibility },
              ].map((s) => (
                <div key={s.label} className="bg-[#262626] border border-[#3A3A3A] rounded p-3">
                  <div className="text-[11px] text-[#A1A1AA] uppercase">{s.label}</div>
                  <div className="text-2xl font-bold text-[#8AB6D6] mt-1">{s.val}/100</div>
                </div>
              ))}
            </div>

            <div className="flex border-b border-[#3A3A3A] mb-5 gap-2">
              {[
                { id: 'findings', label: `1. Prioritized Findings (${audit.findings.length})` },
                { id: 'tokens', label: '2. Competitor Design Token Spy' },
                { id: 'dom', label: '3. DOM & WCAG Telemetry' },
                { id: 'exports', label: '4. Export Markdown & Claude Skills' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition ${
                    activeTab === t.id
                      ? 'border-[#8AB6D6] text-[#8AB6D6]'
                      : 'border-transparent text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'findings' && (
              <div>
                <div className="flex gap-2 mb-4">
                  {['ALL', 'Blocker', 'High', 'Medium', 'Low'].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-3 py-1 rounded text-xs border ${
                        severityFilter === sev
                          ? 'bg-[#8AB6D6]/20 border-[#8AB6D6] text-[#8AB6D6]'
                          : 'bg-[#262626] border-[#3A3A3A] text-[#A1A1AA]'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredFindings.map((f) => (
                    <div key={f.id} className="bg-[#262626] border border-[#3A3A3A] rounded p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono font-bold text-[#8AB6D6]">
                          [{f.severity.toUpperCase()}] {f.id} — {f.domain}
                        </span>
                        <span className="text-xs text-[#A1A1AA]">
                          {f.pageUrl} • {f.viewport}
                        </span>
                      </div>
                      <p className="text-sm font-semibold mb-1">{f.observation}</p>
                      <p className="text-xs text-[#A1A1AA] font-mono mb-2">
                        Target: {f.selectorOrLocation} | Evidence: {f.measuredEvidence}
                      </p>
                      <div className="text-xs bg-[#1E1E1E] border border-[#3A3A3A] rounded p-2.5 text-[#F5F5F7]">
                        <strong className="text-[#8AB6D6]">Fix: </strong>
                        {f.actionableFix}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tokens' && currentCapture && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-2.5">
                    Extracted HEX Color Palette (Click to Copy)
                  </h3>
                  <div className="grid grid-cols-4 gap-2.5">
                    {currentCapture.domTelemetry.designTokens.colors.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => navigator.clipboard.writeText(c.hex)}
                        className="flex items-center gap-2.5 bg-[#262626] border border-[#3A3A3A] rounded p-2 text-left hover:border-[#8AB6D6]"
                      >
                        <span className="w-6 h-6 rounded border border-white/20 shrink-0" style={{ background: c.hex }} />
                        <div>
                          <div className="text-xs font-mono font-bold">{c.hex}</div>
                          <div className="text-[10px] text-[#A1A1AA]">{c.roleHint}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-2.5">
                    Computed Typography Scale
                  </h3>
                  <div className="bg-[#262626] border border-[#3A3A3A] rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1E1E1E] text-[#A1A1AA]">
                        <tr>
                          <th className="p-2.5">Tag</th>
                          <th className="p-2.5">Font Family</th>
                          <th className="p-2.5">Size</th>
                          <th className="p-2.5">Weight</th>
                          <th className="p-2.5">Line Height</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCapture.domTelemetry.designTokens.typographyScale.map((t) => (
                          <tr key={t.tag} className="border-t border-[#3A3A3A]">
                            <td className="p-2.5 font-mono text-[#8AB6D6]">&lt;{t.tag}&gt;</td>
                            <td className="p-2.5">{t.fontFamily}</td>
                            <td className="p-2.5 font-mono">{t.fontSize}</td>
                            <td className="p-2.5 font-mono">{t.fontWeight}</td>
                            <td className="p-2.5 font-mono">{t.lineHeight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dom' && currentCapture && (
              <div className="space-y-4 text-xs">
                <div className="bg-[#262626] border border-[#3A3A3A] rounded p-4">
                  <h4 className="font-bold text-[#8AB6D6] mb-2">Above-the-Fold Primary CTA</h4>
                  <pre className="font-mono whitespace-pre-wrap text-[#A1A1AA]">
                    {JSON.stringify(currentCapture.domTelemetry.aboveTheFoldCTA, null, 2)}
                  </pre>
                </div>
                <div className="bg-[#262626] border border-[#3A3A3A] rounded p-4">
                  <h4 className="font-bold text-[#8AB6D6] mb-2">
                    Heading Hierarchy ({currentCapture.domTelemetry.headingOutline.length} Headings)
                  </h4>
                  <div className="space-y-1 font-mono">
                    {currentCapture.domTelemetry.headingOutline.map((h, i) => (
                      <div key={i}>
                        <span className="text-[#8AB6D6] mr-2">[{h.level}]</span>
                        {h.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exports' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => downloadFile('website-audit.md', audit.rawWebsiteAuditMd)}
                    className="bg-[#8AB6D6] text-[#111111] font-semibold px-4 py-2 rounded text-xs"
                  >
                    Download Raw website-audit.md (For Claude Code)
                  </button>
                  <button
                    onClick={() => downloadFile('client-audit-report.md', audit.clientReportMd)}
                    className="bg-[#262626] border border-[#8AB6D6] text-[#8AB6D6] font-semibold px-4 py-2 rounded text-xs"
                  >
                    Download Polished Client Executive Report (.md)
                  </button>
                  <button
                    onClick={() => downloadFile('SKILL.md', audit.competitorSkillMd)}
                    className="bg-[#262626] border border-[#3A3A3A] text-white font-semibold px-4 py-2 rounded text-xs"
                  >
                    Download Extracted Brand Guardrails SKILL.md
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(audit.zeroApiPromptBundle);
                      alert('Copied Zero-API Prompt Bundle to clipboard!');
                    }}
                    className="bg-[#333333] border border-[#3A3A3A] text-[#8AB6D6] font-semibold px-4 py-2 rounded text-xs"
                  >
                    Copy Zero-API Prompt Bundle
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Preview: website-audit.md (Ready to drop into your Claude Code project)
                  </label>
                  <textarea
                    readOnly
                    value={audit.rawWebsiteAuditMd}
                    className="w-full h-96 bg-[#141414] border border-[#3A3A3A] rounded p-3 font-mono text-xs text-[#F5F5F7]"
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
