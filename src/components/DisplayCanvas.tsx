import { useRef, useCallback, useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

export interface Resolution {
  label: string;
  width: number;
  height: number;
}

export const RESOLUTIONS: Resolution[] = [
  { label: '480×320', width: 480, height: 320 },
  { label: '800×480', width: 800, height: 480 },
  { label: '1280×720', width: 1280, height: 720 },
];

interface DisplayCanvasProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  resolution: Resolution;
  showPlaceholder?: boolean;
  liveMode?: boolean;
  onPopoutChange?: (open: boolean) => void;
}

function openPopout(resolution: Resolution): Window | null {
  const { width, height } = resolution;
  const ar = (width / height).toFixed(6);
  const winW = Math.min(width, 960);
  const winH = Math.round(winW / (width / height));
  const popup = window.open('', 'lvgl-popout',
    `width=${winW},height=${winH},resizable=yes,scrollbars=no`);
  if (!popup) return null;
  popup.document.open();
  popup.document.write(`<!DOCTYPE html><html><head>
<title>LVGL Preview</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;width:100vw;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center}
canvas{width:min(100vw,calc(${ar}*100vh));aspect-ratio:${width}/${height}}
</style></head><body>
<canvas id="m" width="${width}" height="${height}"></canvas>
<script>
var c=document.getElementById('m'),ctx=c.getContext('2d'),go=true;
function draw(){
  if(!go)return;
  try{var s=window.opener&&window.opener.document.getElementById('lvgl-canvas');if(s)ctx.drawImage(s,0,0);}catch(e){}
  requestAnimationFrame(draw);
}
draw();
window.addEventListener('beforeunload',function(){go=false;});
<\/script></body></html>`);
  popup.document.close();
  return popup;
}

const IconFullscreen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

const IconCompress = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
    <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
  </svg>
);

const IconPopout = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
    <rect x="3" y="11" width="10" height="10" rx="1"/>
  </svg>
);

export function DisplayCanvas({ iframeRef, resolution, showPlaceholder, liveMode, onPopoutChange }: DisplayCanvasProps) {
  const { theme } = useTheme();
  const versionRef  = useRef<string>(String(Date.now()));
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const popupRef    = useRef<Window | null>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const src = `/lvgl-runner.html?w=${resolution.width}&h=${resolution.height}&v=${versionRef.current}`;
  const aspectRatio = resolution.width / resolution.height;

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleFullscreen = useCallback(() => {
    if (isFullscreen) document.exitFullscreen();
    else canvasWrapRef.current?.requestFullscreen?.();
  }, [isFullscreen]);

  const handlePopout = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) { popupRef.current.focus(); return; }
    const popup = openPopout(resolution);
    if (!popup) return;
    popupRef.current = popup;
    onPopoutChange?.(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        popupRef.current = null;
        onPopoutChange?.(false);
      }
    }, 500);
  }, [resolution, onPopoutChange]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: theme.bgPanel,
      padding: 16,
      gap: 10,
      overflow: 'hidden',
    }}>
      {/* Canvas area — flex-1 so buttons are excluded from cqh calc */}
      <div style={{
        flex: '1 1 0',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        containerType: 'size',
      } as React.CSSProperties}>
        <div
          ref={canvasWrapRef}
          className="lvgl-canvas-wrap"
          style={{
            position: 'relative',
            width: `min(100%, calc(${aspectRatio.toFixed(6)} * 100cqh))`,
            aspectRatio: `${resolution.width} / ${resolution.height}`,
            border: `2px solid ${theme.borderSubtle}`,
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
            background: '#000',
          }}
        >
          <canvas
            id="lvgl-canvas"
            width={resolution.width}
            height={resolution.height}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
          {showPlaceholder && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'rgba(0,0,0,0.75)', color: '#888',
              pointerEvents: 'none', userSelect: 'none',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span style={{ fontSize: 13, letterSpacing: '0.03em' }}>Press Run to preview</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls — always on dark background, never overlapping canvas */}
      {liveMode && (
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 8 }}>
          <button
            className="lvgl-preview-btn"
            onClick={handlePopout}
            title="Open preview in a separate window (drag to second monitor)"
          >
            <IconPopout /> Pop out
          </button>
          <button
            className="lvgl-preview-btn"
            onClick={handleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
          >
            {isFullscreen ? <IconCompress /> : <IconFullscreen />}
            {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        style={{ display: 'none', width: 0, height: 0, border: 'none' }}
        title="LVGL WASM runner"
      />
    </div>
  );
}
