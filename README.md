# LVGL Web Simulator

A browser-based simulator for [LVGL](https://lvgl.io) — write MicroPython with LVGL bindings and see real-time rendering instantly, no installation required.

Think of it as **CodePen for LVGL**.

---

## Features

- **Live preview** — edit code, see changes after 800ms debounce, zero setup
- **Monaco Editor** — VS Code editor experience in the browser (syntax highlighting, autocomplete)
- **Multiple resolutions** — 480×320, 800×480, 1280×720 (elements scale proportionally)
- **Pop-out preview** — open the preview in a separate window and move it to a second monitor
- **Fullscreen mode** — maintains aspect ratio, enter/exit with a button
- **Open .py files** — load scripts directly into the editor
- **Resizable output panel** — see `print()` output and errors, drag to resize

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
2. Runner prepends a screen reset: `lv.obj(None)` + `lv.screen_load()` to clear previous state
3. `mp_js_do_str` executes the script, then appends `lv.tick_inc(100)` + `lv.timer_handler()` to flush display
4. LVGL draws pixels to the canvas — visible instantly

**Asyncify conflict prevention:**
`mp_js_do_str` and `mp_handle_pending` are both asyncified — only one can be active at a time. An `executingCode` flag pauses the ticker loop during script execution.

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

> `lv.init()` and the display driver are initialized automatically — no need to call them.

---

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Monaco Editor** (`@monaco-editor/react`)
- **lv_micropython** WASM — MicroPython + LVGL, compiled with Emscripten

---

## License

MIT
