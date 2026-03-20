import MarkdownIt from 'markdown-it';

import type { ReportData, ReportResult } from 'core/src/reports/reports.types';

const md = new MarkdownIt({ html: true });

export function writeReportHtml(reportData: ReportData, result: ReportResult): string {
  const title = escapeHtml(result.title ?? 'Report');
  const summary = escapeHtml(result.summary ?? '');
  const verdict = escapeHtml(result.verdict_summary ?? '');
  const quote = escapeHtml(result.verdict_best_quote ?? '');
  const detailedHtml = result.detailed ? md.render(result.detailed) : '';

  const sentimentBlock = result.sentiment_groups?.length
    ? `
    <section class="sentiment">
      <h2>Sentiment</h2>
      <div class="sentiment-groups">
        ${result.sentiment_groups
          .map(
            g => `
          <div class="sentiment-group" style="--pct: ${g.percentage}; --color: ${g.color ?? '#666'}">
            <span class="label">${escapeHtml(g.type)}</span>
            <span class="pct">${g.percentage}%</span>
            ${(g.quotes ?? [])
              .slice(0, 3)
              .map(
                q =>
                  `<blockquote class="quote">${escapeHtml(q.text)} <cite>${escapeHtml(q.author_name)}</cite></blockquote>`
              )
              .join('')}
          </div>`
          )
          .join('')}
      </div>
    </section>`
    : '';

  const crowdWallBlock = result.crowd_wall?.length
    ? `
    <section class="crowd-wall">
      <h2>Crowd wall</h2>
      <div class="quotes">
        ${result.crowd_wall
          .slice(0, 12)
          .map(
            q =>
              `<blockquote>${escapeHtml(q.text)} <cite>${escapeHtml(q.author_name)}, ${q.author_age}</cite></blockquote>`
          )
          .join('')}
      </div>
    </section>`
    : '';

  const debateBlock =
    result.personas?.length && result.debate?.length
      ? `
    <section class="debate">
      <h2>Debate</h2>
      <div class="debate-messages">
        ${result.debate
          .slice(0, 20)
          .map(
            d =>
              `<div class="debate-msg"><strong>${escapeHtml(d.author_id)}</strong>: ${escapeHtml(d.text)}</div>`
          )
          .join('')}
      </div>
    </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a; background: #fafafa; }
    body { max-width: 720px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.15rem; margin-top: 2rem; margin-bottom: 0.75rem; color: #333; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .summary { margin-bottom: 1.5rem; }
    .verdict { margin-bottom: 1rem; padding: 1rem; background: #eee; border-radius: 6px; }
    .verdict-quote { font-style: italic; margin-top: 0.5rem; }
    .detailed { margin-top: 1.5rem; }
    .detailed h3 { font-size: 1.05rem; margin-top: 1.25rem; }
    .detailed p { margin: 0.5rem 0; }
    .detailed ul, .detailed ol { margin: 0.5rem 0; padding-left: 1.5rem; }
    .sentiment-groups { display: grid; gap: 1rem; }
    .sentiment-group { padding: 1rem; border-left: 4px solid var(--color, #666); background: #f5f5f5; }
    .sentiment-group .pct { font-weight: 600; }
    .quote, blockquote { margin: 0.5rem 0; padding-left: 1rem; border-left: 3px solid #ccc; }
    cite { font-size: 0.85rem; color: #666; }
    .crowd-wall .quotes { display: grid; gap: 0.75rem; }
    .debate-messages { display: flex; flex-direction: column; gap: 0.5rem; }
    .debate-msg { padding: 0.5rem; background: #f0f0f0; border-radius: 4px; }
  </style>
</head>
<body>
  <article>
    <h1>${title}</h1>
    <p class="meta">Prompt: ${escapeHtml(reportData.prompt ?? '')}</p>
    <section class="summary">
      <p>${summary}</p>
    </section>
    <section class="verdict">
      <p><strong>Verdict</strong>: ${verdict}</p>
      ${quote ? `<p class="verdict-quote">${quote}</p>` : ''}
    </section>
    ${sentimentBlock}
    ${crowdWallBlock}
    ${debateBlock}
    <section class="detailed">
      <h2>Detailed</h2>
      <div class="detailed-content">${detailedHtml}</div>
    </section>
  </article>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
