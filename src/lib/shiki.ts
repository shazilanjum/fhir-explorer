/**
 * Shared Shiki highlighter, assembled from the fine-grained core so the bundle
 * only carries what we use: the JSON grammar, one theme, and the JS regex
 * engine (no Oniguruma WASM, no other languages).
 *
 * Everything is dynamically imported inside getHighlighter(), so Shiki lands in
 * its own chunk that loads on demand (first time a JSON pane renders) rather
 * than blocking the initial app bundle.
 */

import type { HighlighterCore } from 'shiki/core';

let instance: Promise<HighlighterCore> | null = null;

export const JSON_THEME = 'github-dark';

export function getHighlighter(): Promise<HighlighterCore> {
  if (!instance) {
    instance = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, githubDark, json] =
        await Promise.all([
          import('shiki/core'),
          import('shiki/engine/javascript'),
          import('shiki/themes/github-dark.mjs'),
          import('shiki/langs/json.mjs'),
        ]);
      return createHighlighterCore({
        themes: [githubDark.default],
        langs: [json.default],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return instance;
}
