/**
 * A CRT-style boot overlay that opens the landing page — and unlike most
 * boot-sequence gimmicks, every line it prints is real: it makes one actual
 * `GET /metadata` call and reports that call's true timing and payload.
 *
 * Scoped to the Terminal theme locally via a nested `data-theme="terminal"` —
 * the boot always reads as a terminal booting, regardless of whichever theme
 * the visitor leaves the scrubber on afterwards. It plays once per session,
 * is fully skippable, and collapses to a single instant frame under
 * `prefers-reduced-motion`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { fhirClient } from '../../fhir/client';
import { DEFAULT_BASE_URL } from '../../context/ServerContext';
import { readStorage, writeStorage } from '../../lib/storage';

const SEEN_KEY = 'bootSeen';
const FETCH_TIMEOUT_MS = 4000;
const CHAR_MS = 16;

interface Line {
  text: string;
  /** Typed character-by-character (a "command") vs. printed instantly (output). */
  typed: boolean;
}

function buildLines(result: BootResult): Line[] {
  const target = new URL(DEFAULT_BASE_URL).host;
  if (result.kind === 'ok') {
    return [
      { text: `connecting to ${target}_`, typed: true },
      { text: `$ GET /metadata`, typed: true },
      {
        text: `  200 OK · ${result.ms} ms · ${result.bytes}`,
        typed: false,
      },
      { text: `  ${result.software}`, typed: false },
      { text: `  FHIR ${result.fhirVersion} · ${result.resourceCount} resource types`, typed: false },
      { text: `ready_`, typed: true },
    ];
  }
  return [
    { text: `connecting to ${target}_`, typed: true },
    { text: `$ GET /metadata`, typed: true },
    { text: `  (no response — ${result.reason})`, typed: false },
    { text: `  showing the instrument anyway_`, typed: false },
    { text: `ready_`, typed: true },
  ];
}

type BootResult =
  | { kind: 'ok'; ms: number; bytes: string; software: string; fhirVersion: string; resourceCount: number }
  | { kind: 'degraded'; reason: string };

async function runRealBoot(): Promise<BootResult> {
  const t0 = performance.now();
  try {
    const capability = await Promise.race([
      fhirClient.getCapabilityStatement(DEFAULT_BASE_URL),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS),
      ),
    ]);
    const ms = Math.round(performance.now() - t0);
    const rest = capability.rest?.find((r) => r.mode === 'server') ?? capability.rest?.[0];
    const resourceCount = new Set(rest?.resource?.map((r) => r.type) ?? []).size;
    const software = capability.software?.name
      ? `${capability.software.name}${capability.software.version ? ` ${capability.software.version}` : ''}`
      : 'unnamed server';
    // Byte size isn't tracked on this call path — approximate from the
    // serialized payload so the line still reports something real.
    const bytes = `${Math.round(JSON.stringify(capability).length / 1024)} kB`;
    return {
      kind: 'ok',
      ms,
      bytes,
      software,
      fhirVersion: capability.fhirVersion ?? '—',
      resourceCount,
    };
  } catch {
    return { kind: 'degraded', reason: 'network or CORS' };
  }
}

export function BootSequence({ onDone }: { onDone: () => void }) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const alreadySeen = useMemo(() => readStorage(sessionStorage, SEEN_KEY) === '1', []);
  const skip = reducedMotion || alreadySeen;

  const [visible, setVisible] = useState(!skip);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    writeStorage(sessionStorage, SEEN_KEY, '1');
    setVisible(false);
    window.setTimeout(onDone, 220); // let the fade-out play before unmounting
  };

  // Skip entirely — no boot this run.
  useEffect(() => {
    if (skip) {
      writeStorage(sessionStorage, SEEN_KEY, '1');
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    runRealBoot().then((result) => {
      if (!cancelled) setLines(buildLines(result));
    });
    return () => {
      cancelled = true;
    };
  }, [skip]);

  // Any key skips, not just a click while the overlay itself has focus.
  useEffect(() => {
    if (skip) return;
    const onKey = () => finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  // Typewriter: advance one character (typed lines) or one whole line (output
  // lines) at a time, then auto-finish shortly after the last line lands.
  useEffect(() => {
    if (!lines || skip) return;
    const current = lines[lineIndex];
    if (!current) {
      const t = window.setTimeout(finish, 700);
      return () => window.clearTimeout(t);
    }
    if (!current.typed) {
      const t = window.setTimeout(() => {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }, 260);
      return () => window.clearTimeout(t);
    }
    if (charIndex < current.text.length) {
      const t = window.setTimeout(() => setCharIndex((c) => c + 1), CHAR_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setLineIndex((i) => i + 1);
      setCharIndex(0);
    }, 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, lineIndex, charIndex, skip]);

  if (skip) return null;

  return (
    <div
      data-theme="terminal"
      onClick={finish}
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-paper px-6 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="w-full max-w-lg font-mono text-sm text-ink">
        {(lines ?? []).slice(0, lineIndex + 1).map((line, i) => (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {i === lineIndex && line.typed ? line.text.slice(0, charIndex) : line.text}
            {i === lineIndex && line.typed && charIndex < line.text.length && (
              <span className="text-accent">▌</span>
            )}
          </p>
        ))}
        {!lines && <p className="text-ink-2">connecting_</p>}
      </div>
      <p className="absolute bottom-6 font-mono text-xs text-ink-3">
        click, or press any key, to skip
      </p>
    </div>
  );
}
