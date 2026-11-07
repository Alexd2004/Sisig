#!/usr/bin/env node
// Builds the PDF versions of the docs in docs/pdf/ from the Markdown sources.
//
//   pnpm docs:pdf          build every PDF
//   pnpm docs:pdf --check  only check that every Mermaid diagram renders (no PDFs written)
//
// The Markdown files are the source of truth; regenerate the PDFs in the same PR as any doc change.
// Needs Google Chrome (or Chromium) and network access: the page loads marked and Mermaid from
// jsDelivr. Set CHROME_PATH to use a browser that is not in a standard location.
// No npm dependencies: Node built-ins plus a headless browser.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'pdf');
const checkOnly = process.argv.includes('--check');

const MARKED = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js';
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js';
const REPO_URL = 'https://github.com/Alexd2004/Sisig/blob/main/';

// Every guide, in reading order, for the combined handbook.
const HANDBOOK = [
  'README.md',
  'docs/README.md',
  'docs/LOCAL-DEVELOPMENT.md',
  'docs/ARCHITECTURE.md',
  'docs/SUPABASE.md',
  'supabase/README.md',
  'supabase/CONVENTIONS.md',
  'docs/DEVOPS-02-CI.md',
  'CONTRIBUTING.md',
  'apps/mobile/README.md',
  'packages/claude/README.md',
  'CLAUDE_SKILLS.md',
];
// Guides that also get a PDF of their own (named after the file).
const SINGLES = [
  'docs/SUPABASE.md',
  'docs/ARCHITECTURE.md',
  'docs/LOCAL-DEVELOPMENT.md',
  'docs/DEVOPS-02-CI.md',
  'CONTRIBUTING.md',
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      execFileSync(c, ['--version'], { stdio: 'ignore' });
      return c;
    } catch {
      // try the next one
    }
  }
  throw new Error('Google Chrome or Chromium not found. Install it or set CHROME_PATH.');
}

const slugOf = (p) => p.replace(/\.md$/i, '').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function loadDocs(paths) {
  return paths.map((p) => {
    const file = path.join(root, p);
    if (!fs.existsSync(file)) throw new Error(`Missing doc: ${p}`);
    return { path: p, slug: slugOf(p), md: fs.readFileSync(file, 'utf8') };
  });
}

function buildHtml({ title, docs, handbook, date }) {
  const cover = handbook
    ? `<section class="cover">
        <div class="cover-mark">Sisig Eh!</div>
        <h1 class="cover-title">${esc(title)}</h1>
        <p class="cover-sub">Every developer guide in the repository, in one file.</p>
        <p class="cover-meta">Generated ${esc(date)} with <code>pnpm docs:pdf</code>.<br/>
        The Markdown files in the repository are the source of truth.</p>
        <nav class="toc" id="toc"><h2>Contents</h2><ol></ol></nav>
      </section>`
    : '';
  const footerTitle = esc(title).replace(/"/g, '');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  @page { size: Letter; margin: 18mm 16mm 20mm 16mm;
    @bottom-left { content: "${footerTitle}"; font: 8pt -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #777; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #777; } }
  @page :first { @bottom-left { content: none; } @bottom-right { content: none; } }
  :root { --ink: #1f2328; --muted: #59636e; --line: #d1d9e0; --code-bg: #f6f8fa; --accent: #b4401b; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 10.5pt/1.5 -apple-system, 'Helvetica Neue', Arial, sans-serif; color: var(--ink); background: #fff; margin: 0; }
  h1, h2, h3, h4 { line-height: 1.25; break-after: avoid; }
  h1 { font-size: 21pt; margin: 0 0 10pt; padding-bottom: 6pt; border-bottom: 1px solid var(--line); }
  h2 { font-size: 15pt; margin: 20pt 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid var(--line); }
  h3 { font-size: 12pt; margin: 16pt 0 6pt; }
  h4 { font-size: 10.5pt; margin: 12pt 0 4pt; }
  p, ul, ol, table, pre, blockquote { margin: 0 0 9pt; }
  a { color: #0969da; text-decoration: none; }
  code { font: 8.8pt/1.45 ui-monospace, Menlo, Consolas, monospace; background: var(--code-bg); padding: 1pt 3pt; border-radius: 3pt; }
  pre { background: var(--code-bg); border: 1px solid var(--line); border-radius: 5pt; padding: 7pt 9pt; white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; padding: 0; font-size: 8.3pt; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; }
  th, td { border: 1px solid var(--line); padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: var(--code-bg); }
  tr { break-inside: avoid; }
  blockquote { border-left: 3pt solid var(--line); color: var(--muted); padding: 0 0 0 9pt; margin-left: 0; }
  img { max-width: 100%; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 14pt 0; }
  .doc + .doc { break-before: page; }
  .doc-source { font-size: 8.5pt; color: var(--muted); margin: -4pt 0 12pt; }
  .mermaid { break-inside: avoid; text-align: center; margin: 10pt 0 12pt; }
  .mermaid svg { max-width: 100% !important; max-height: 215mm; height: auto; }
  .mermaid-error { break-inside: avoid; border: 1.5pt solid #cf222e; background: #ffebe9; padding: 8pt; font-size: 9pt; white-space: pre-wrap; }
  .cover { break-after: page; padding-top: 50mm; }
  .cover-mark { font-size: 12pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
  .cover-title { font-size: 30pt; border: 0; margin: 6pt 0 10pt; }
  .cover-sub { font-size: 13pt; color: var(--muted); }
  .cover-meta { font-size: 9.5pt; color: var(--muted); margin-top: 18pt; }
  .toc { margin-top: 26pt; }
  .toc h2 { font-size: 13pt; }
  .toc ol { padding-left: 16pt; }
  .toc li { margin: 2pt 0; }
  .toc .toc-path { color: var(--muted); font-size: 8.5pt; margin-left: 6pt; }
</style>
<script src="${MARKED}"></script>
<script src="${MERMAID}"></script>
</head>
<body>
${cover}
<main id="docs"></main>
<script id="doc-data" type="application/json">${JSON.stringify(docs).replace(/</g, '\\u003c')}</script>
<script>
(async () => {
  const errors = [];
  try {
    const DOCS = JSON.parse(document.getElementById('doc-data').textContent);
    const REPO_URL = ${JSON.stringify(REPO_URL)};
    const included = new Map(DOCS.map((d) => [d.path, d.slug]));
    const slugify = (t) => t.trim().toLowerCase().replace(/[^\\p{L}\\p{N}\\- _]/gu, '').replace(/ /g, '-');
    marked.use({ gfm: true });
    const main = document.getElementById('docs');
    const toc = document.querySelector('#toc ol');
    let diagram = 0;
    for (const d of DOCS) {
      const sec = document.createElement('section');
      sec.className = 'doc';
      sec.id = d.slug;
      sec.innerHTML = marked.parse(d.md);
      const h1 = sec.querySelector('h1');
      const src = document.createElement('p');
      src.className = 'doc-source';
      src.textContent = 'Source: ' + d.path;
      if (h1) h1.after(src); else sec.prepend(src);
      // GitHub-style heading ids, prefixed with the document slug.
      const seen = {};
      sec.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        let s = slugify(h.textContent);
        if (seen[s] === undefined) seen[s] = 0; else s += '-' + (++seen[s]);
        h.id = d.slug + '--' + s;
      });
      // Links: in-PDF anchors for docs in this PDF, GitHub URLs for everything else in the repo.
      sec.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href');
        if (/^[a-z]+:/i.test(href)) return;
        const u = new URL(href, 'https://repo.invalid/' + d.path);
        const target = decodeURIComponent(u.pathname.slice(1));
        const hash = u.hash ? u.hash.slice(1) : '';
        if (href.startsWith('#')) { a.setAttribute('href', '#' + d.slug + '--' + hash); return; }
        if (included.has(target)) {
          const slug = included.get(target);
          a.setAttribute('href', '#' + (hash ? slug + '--' + hash : slug));
        } else {
          a.setAttribute('href', REPO_URL + target + u.hash);
        }
      });
      // Mermaid fences become diagrams.
      sec.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.dataset.doc = d.path;
        div.dataset.index = String(++diagram);
        div.textContent = code.textContent;
        code.parentElement.replaceWith(div);
      });
      main.appendChild(sec);
      if (toc && h1) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="#' + d.slug + '"></a><span class="toc-path"></span>';
        li.firstChild.textContent = h1.textContent;
        li.lastChild.textContent = d.path;
        toc.appendChild(li);
      }
    }
    // useMaxWidth false keeps small diagrams at their natural size; CSS max-width shrinks wide ones.
    const natural = { useMaxWidth: false };
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'strict',
      fontFamily: '-apple-system, Helvetica Neue, Arial, sans-serif',
      flowchart: natural, sequence: natural, er: natural, state: natural, class: natural, gantt: natural, timeline: natural,
    });
    let n = 0;
    for (const el of document.querySelectorAll('.mermaid')) {
      const text = el.textContent;
      try {
        const { svg } = await mermaid.render('mmd-' + (++n), text);
        el.innerHTML = svg;
      } catch (e) {
        const msg = (e && e.message) || String(e);
        errors.push(el.dataset.doc + ' diagram ' + el.dataset.index + ': ' + msg.split('\\n').slice(0, 4).join(' | '));
        el.className = 'mermaid-error';
        el.textContent = 'Diagram failed to render (' + msg.split('\\n')[0] + '). See the Markdown source on GitHub.';
      }
    }
  } catch (e) {
    errors.push('page script: ' + ((e && e.message) || String(e)));
  }
  const status = document.createElement('div');
  status.id = 'render-status';
  status.hidden = true;
  status.dataset.done = '1';
  status.textContent = JSON.stringify(errors);
  document.body.appendChild(status);
})();
</script>
</body></html>`;
}

function runChrome(chrome, profile, extra, url) {
  return execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      '--virtual-time-budget=60000',
      '--run-all-compositor-stages-before-draw',
      ...extra,
      url,
    ],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function renderStatus(dom) {
  const m = dom.match(/<div id="render-status"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return { done: false, errors: ['the page did not finish rendering (network or script problem)'] };
  const text = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return { done: true, errors: JSON.parse(text) };
}

function main() {
  const chrome = findChrome();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sisig-docs-pdf-'));
  const profile = path.join(tmp, 'profile');
  const date = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const jobs = [
    { title: 'Sisig Developer Handbook', docs: loadDocs(HANDBOOK), handbook: true, out: 'Sisig-Developer-Handbook.pdf' },
    ...SINGLES.map((p) => {
      const [doc] = loadDocs([p]);
      const h1 = (doc.md.match(/^#\s+(.+)$/m) || [])[1] || path.basename(p, '.md');
      return { title: h1.trim(), docs: [doc], handbook: false, out: path.basename(p, '.md') + '.pdf' };
    }),
  ];
  let failed = false;
  try {
    if (!checkOnly) fs.mkdirSync(outDir, { recursive: true });
    for (const job of jobs) {
      const htmlFile = path.join(tmp, job.out.replace(/\.pdf$/, '.html'));
      fs.writeFileSync(htmlFile, buildHtml({ ...job, date }));
      const url = 'file://' + htmlFile;
      const status = renderStatus(runChrome(chrome, profile, ['--dump-dom'], url));
      if (status.errors.length) {
        failed = true;
        console.error(`✗ ${job.out}`);
        for (const e of status.errors) console.error(`    ${e}`);
        continue;
      }
      if (checkOnly) {
        console.log(`✓ ${job.out}: all diagrams render`);
        continue;
      }
      const out = path.join(outDir, job.out);
      runChrome(chrome, profile, ['--no-pdf-header-footer', `--print-to-pdf=${out}`], url);
      const kb = Math.round(fs.statSync(out).size / 1024);
      console.log(`✓ docs/pdf/${job.out} (${kb} KB)`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (failed) {
    console.error('\nSome diagrams failed to render. Fix the Mermaid source and run again.');
    process.exit(1);
  }
}

main();
