# LVGL Web Simulator

A browser-based simulator for [LVGL](https://lvgl.io) — write MicroPython with LVGL bindings and see real-time rendering instantly, no installation required.

Think of it as **CodePen for LVGL**.

---

## Features

### Editor
- **Monaco Editor** — full VS Code experience: syntax highlighting, autocomplete, multi-cursor
- **C/C++ support** — open `.c`, `.cpp`, `.h`, `.hpp` files to view and edit LVGL C code with full syntax highlighting
- **Python support** — open `.py` files and **run** them directly via the MicroPython + LVGL WASM runtime
- **Open files** — load scripts directly into the editor via the Open button
- **Keyboard shortcuts** — see the full list with the keyboard icon button (⌘ on macOS, Ctrl on Windows/Linux)

> **C/C++ vs Python:** C/C++ files are for viewing and editing only — the browser runtime executes MicroPython.
> The LVGL API is nearly identical between C and Python: `lv_btn_create(scr)` → `lv.button(scr)`, `lv_obj_set_size(obj, w, h)` → `obj.set_size(w, h)`.

### Preview
- **Live mode** — click Run to enter live mode; edits auto-run after an 800ms debounce
- **Stop** — exits live mode and clears the canvas
- **Multiple resolutions** — 480×320, 800×480, 1280×720; elements scale proportionally at higher resolutions
- **Aspect-ratio scaling** — preview fits available space; dragging the output panel up shrinks the canvas proportionally
- **Fullscreen** — enter/exit fullscreen from the preview controls; aspect ratio is preserved
- **Pop-out window** — open the preview in a separate window (drag it to a second monitor); the main window switches to a two-column editor + output layout while the popup is open

### UI
- **Light / dark theme** — toggle with the ☀/🌙 button; preference persisted in localStorage (default: dark)
- **Resizable output panel** — drag the top edge to resize; height persisted in localStorage
- **Output panel** — shows `print()` output and runtime errors with color coding
- **GitHub link** — icon button in the toolbar; shows ⭐ star count once the repo reaches 1000 stars

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + Enter` | Run |
| `Ctrl/⌘ + .` | Stop |
| `Ctrl/⌘ + /` | Toggle comment |
| `Shift + Alt + F` | Format document |
| `Ctrl/⌘ + D` | Select next occurrence |
| `Alt + ↑ / ↓` | Move line up / down |
| `Ctrl/⌘ + Shift + K` | Delete line |
| `Ctrl/⌘ + F` | Find |
| `Ctrl/⌘ + H` | Find & replace |

---

## How It Works

The simulator runs entirely in the browser — no backend, no server-side execution.

```
┌────────────────────────────────────────────────────────┐
│                    React App (main window)              │
│                                                        │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Monaco Editor│    │  <canvas id="lvgl-canvas">   │  │
│  │  (MicroPy)   │    │                              │  │
│  └──────────────┘    └──────────────────────────────┘  │
│                                    ▲                   │
│                               draws pixels             │
│  ┌─────────────────────────────┐   │                   │
│  │  hidden <iframe>            │   │                   │
│  │  ┌──────────────────────┐   │   │                   │
│  │  │  lv_micropython WASM │───┘   │                   │
│  │  │  MicroPython + LVGL  │       │                   │
│  │  └──────────────────────┘       │                   │
│  └─────────────────────────────────┘                   │
└────────────────────────────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| `lv_micropython` WASM | MicroPython + LVGL runtime compiled to WebAssembly |
| Hidden `<iframe>` | Runs the WASM in isolation; canvas access redirected to parent window |
| `mp_js_do_str` | Asyncified WASM function that executes MicroPython code |
| `mp_handle_pending` | Asyncified WASM ticker called every 5ms (LVGL event loop) |
| `lv.sdl_window_create(W, H)` | Initializes the SDL2 display driver (required before any widget) |

**Execution flow:**
1. User clicks **Run** (or edits code in live mode)
2. Runner prepends a screen reset (`lv.obj(None)` + `lv.screen_load()`) to clear previous state
3. `mp_js_do_str` executes the script, then appends `lv.tick_inc(100)` + `lv.timer_handler()` to flush the display
4. LVGL draws pixels to the canvas — visible instantly

**Asyncify conflict prevention:**
`mp_js_do_str` and `mp_handle_pending` are both asyncified — only one can be active at a time. An `executingCode` flag pauses the ticker loop during script execution.

**Pop-out preview:**
The popup window mirrors the canvas via `requestAnimationFrame` + `drawImage`. The hidden `<iframe>` stays mounted (`display: none`) so the WASM runtime keeps running while the popup is open.

---

## Getting Started

### Prerequisites

- Node.js 18+
- WASM files from [sim.lvgl.io](https://sim.lvgl.io) (see below)

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
```

### WASM files

Place these in `public/wasm/`:

```
public/wasm/
  firmware.wasm        # lv_micropython compiled to WASM
  micropython.js       # Emscripten JS glue
  wasm_file_api.js     # BrowserFS file API bridge
```

These are sourced from [sim.lvgl.io](https://sim.lvgl.io).

---

## Writing LVGL Code

```python
import lvgl as lv

scr = lv.screen_active()

btn = lv.button(scr)
btn.set_size(120, 50)
btn.center()

label = lv.label(btn)
label.set_text("Hello LVGL!")
label.center()
```

> `lv.init()` and the display driver are initialized automatically — no need to call them manually.

---

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Monaco Editor** (`@monaco-editor/react`)
- **lv_micropython** WASM — MicroPython + LVGL, compiled with Emscripten

---

## License

MIT
