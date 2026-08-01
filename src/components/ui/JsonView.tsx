/**
 * Syntax-highlighted JSON pane, powered by Shiki. The highlighter is async
 * (WASM + grammar load), so we render a plain, monospaced fallback first and
 * swap in the highlighted markup once it resolves.
 */

import { useEffect, useState } from 'react';
import { getHighlighter, JSON_THEME } from '../../lib/shiki';

export function JsonView({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getHighlighter()
      .then((hl) => {
        if (active) {
          setHtml(hl.codeToHtml(json, { lang: 'json', theme: JSON_THEME }));
        }
      })
      .catch(() => {
        // Fall back to the plain <pre> if Shiki fails to load.
        if (active) setHtml(null);
      });
    return () => {
      active = false;
    };
  }, [json]);

  // Vertical scroll only — long lines wrap instead of causing horizontal
  // overflow. The parent supplies the fixed height (see ResourceDetail).
  const wrapCls =
    '[&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap [&_code]:break-words';

  if (html) {
    return (
      <div
        className={`shiki-pane scrollbar-thin h-full overflow-y-auto overflow-x-hidden rounded-card text-xs leading-relaxed [&_pre]:m-0 [&_pre]:rounded-card [&_pre]:p-4 ${wrapCls}`}
        // Shiki returns a self-contained <pre><code> string with inline colors.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre
      className="scrollbar-thin h-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-card p-4 font-mono text-xs leading-relaxed text-paper"
      style={{ backgroundColor: 'var(--color-code-bg)' }}
    >
      <code>{json}</code>
    </pre>
  );
}
