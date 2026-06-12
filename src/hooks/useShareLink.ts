import { useCallback, useEffect, useState } from 'react';
import LZString from 'lz-string';

const HASH_PARAM = 'code';
const LANG_PARAM = 'lang';

export interface SharedSnippet {
  code: string;
  language: string;
}

function parseHash(): SharedSnippet | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const compressed = params.get(HASH_PARAM);
  if (!compressed) return null;
  try {
    const code = LZString.decompressFromEncodedURIComponent(compressed);
    if (!code) return null;
    const lang = params.get(LANG_PARAM) ?? 'python';
    return { code, language: lang };
  } catch {
    return null;
  }
}

/**
 * Returns a shareable URL that encodes the given code + language in the location hash.
 * Decoding is handled by `parseHash` and exposed via `useSharedSnippet`.
 */
export function buildShareUrl(code: string, language: string): string {
  const compressed = LZString.compressToEncodedURIComponent(code);
  const params = new URLSearchParams();
  params.set(HASH_PARAM, compressed);
  params.set(LANG_PARAM, language);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${params.toString()}`;
}

/** One-shot: read a shared snippet from the URL hash on first render. */
export function useSharedSnippet(): SharedSnippet | null {
  const [snippet] = useState<SharedSnippet | null>(() => parseHash());
  return snippet;
}

/** Copy a share URL for the given code+language to the clipboard. */
export function useShareToClipboard(): {
  share: (code: string, language: string) => Promise<void>;
  status: 'idle' | 'copied' | 'error';
} {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const share = useCallback(async (code: string, language: string) => {
    try {
      const url = buildShareUrl(code, language);
      // Update the address bar so the user sees the canonical share URL
      window.history.replaceState(null, '', url);
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (status === 'idle') return;
    const t = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(t);
  }, [status]);

  return { share, status };
}
