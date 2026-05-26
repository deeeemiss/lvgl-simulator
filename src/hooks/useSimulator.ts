import { useRef, useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';

export type SimulatorStatus = 'loading' | 'ready' | 'running' | 'error' | 'compiling';

export interface SimulatorOutput {
  type: 'stdout' | 'stderr' | 'error' | 'info' | 'separator';
  text: string;
}

interface UseSimulatorReturn {
  status: SimulatorStatus;
  output: SimulatorOutput[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** When set, DisplayCanvas should load c-runner.html with this artifact id */
  cArtifactId: string | null;
  run: (code: string, language?: string, width?: number, height?: number) => void;
  stop: () => void;
  clearOutput: () => void;
}

export function useSimulator(): UseSimulatorReturn {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<SimulatorStatus>('loading');
  const [output, setOutput] = useState<SimulatorOutput[]>([]);
  const [cArtifactId, setCArtifactId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const compileStartRef = useRef<number>(0);

  const appendOutput = useCallback((entry: SimulatorOutput) => {
    setOutput(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    function handlePrint(event: Event) {
      const detail = (event as CustomEvent & { detail: Uint8Array }).detail;
      if (!detail) return;
      const text = new TextDecoder().decode(detail).replace(/\r?\n$/, '');
      if (text) appendOutput({ type: 'stdout', text });
    }

    function handleMessage(event: MessageEvent) {
      if (!event.data) return;
      const { type } = event.data;
      if (type === 'ready') {
        flushSync(() => setStatus('ready'));
      } else if (type === 'status') {
        flushSync(() => setStatus(event.data.status as SimulatorStatus));
      } else if (type === 'error') {
        flushSync(() => {
          appendOutput({ type: 'error', text: event.data.message ?? 'Unknown error' });
          setStatus('error');
        });
      } else if (type === 'print') {
        appendOutput({ type: 'stdout', text: event.data.text });
      } else if (type === 'stdout') {
        appendOutput({ type: 'stdout', text: event.data.text });
      } else if (type === 'stderr') {
        appendOutput({ type: 'stderr', text: event.data.text });
      }
    }

    window.addEventListener('micropython-print', handlePrint);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('micropython-print', handlePrint);
      window.removeEventListener('message', handleMessage);
    };
  }, [appendOutput]);

  const run = useCallback((
    code: string,
    language = 'python',
    width = 480,
    height = 320,
  ) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (language === 'cpp') {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      compileStartRef.current = Date.now();
      flushSync(() => {
        setStatus('compiling');
        setOutput(prev => [
          ...prev,
          ...(prev.length > 0 ? [{ type: 'separator' as const, text: '' }] : []),
          { type: 'info', text: `Compiling C/C++ (${width}×${height})…` },
        ]);
      });

      (async () => {
        try {
          const resp = await fetch('/api/compile-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, width, height }),
            signal: ctrl.signal,
          });

          if (!resp.ok || !resp.body) {
            const data = await resp.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error ?? 'Compilation failed');
          }

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const msg = JSON.parse(line.slice(6)) as {
                type: string; text?: string; id?: string;
                success?: boolean; error?: string; elapsed?: string; cached?: boolean;
              };
              if (msg.type === 'log' && msg.text) {
                const isError = /:\s*(fatal )?error:/.test(msg.text);
                appendOutput({ type: isError ? 'stderr' : 'info', text: msg.text });
              } else if (msg.type === 'done') {
                if (msg.success && msg.id) {
                  const elapsed = ((Date.now() - compileStartRef.current) / 1000).toFixed(1);
                  flushSync(() => {
                    appendOutput({ type: 'info', text: msg.cached ? `Cache hit — loading… (${elapsed}s)` : `Compilation successful — loading… (${elapsed}s)` });
                    setStatus('running');
                  });
                  setCArtifactId(msg.id);
                } else {
                  flushSync(() => {
                    appendOutput({ type: 'error', text: msg.error ?? 'Compilation failed' });
                    setStatus('error');
                  });
                }
              }
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') return;
          const msg = err instanceof Error ? err.message : String(err);
          flushSync(() => {
            appendOutput({ type: 'error', text: msg });
            setStatus('error');
          });
        }
      })();
    } else {
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      if (!iframe.contentWindow) return;
      setOutput(prev => prev.length > 0 ? [...prev, { type: 'separator' as const, text: '' }] : prev);
      iframe.contentWindow.postMessage({ type: 'run', code }, '*');
    }
  }, [appendOutput]);

  const stop = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    const iframe = iframeRef.current;
    if (!iframe) return;
    flushSync(() => {
      setStatus('loading');
      setCArtifactId(null); // revert to python runner
      setOutput([]);
    });
    // Force micropython iframe to reload by bouncing src
    const src = iframe.src;
    iframe.src = '';
    setTimeout(() => { if (iframeRef.current) iframeRef.current.src = src; }, 50);
  }, []);

  const clearOutput = useCallback(() => setOutput([]), []);

  return { status, output, iframeRef, cArtifactId, run, stop, clearOutput };
}
