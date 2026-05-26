# LVGL Web Simulator

A browser-based simulator for [LVGL](https://lvgl.io) — write LVGL code in **MicroPython** or **C/C++** and see real-time rendering instantly, no installation required.

Think of it as **CodePen for LVGL**.

---

## Features

### Editor
- **Monaco Editor** — full VS Code experience: syntax highlighting, autocomplete, multi-cursor
- **MicroPython** — run LVGL Python code instantly via the MicroPython + LVGL WASM runtime
- **C / C++** — compile and run real C/C++ LVGL code via a server-side Emscripten pipeline
- **Open files** — load `.py`, `.c`, `.cpp`, `.h`, `.hpp` files directly into the editor
- **Clickable errors** — compiler errors are clickable and jump to the exact line in the editor
- **Keyboard shortcuts** — see the full list with the keyboard icon button (⌘ on macOS, Ctrl on Windows/Linux)

### Preview
- **Live mode (Python)** — click Run to enter live mode; edits auto-run after an 800ms debounce
- **C/C++ compile & run** — click Run to compile server-side via Emscripten; output streams live during compilation
- **Stop** — exits live mode and clears the canvas
- **Multiple resolutions** — 480×320, 800×480, 1280×720; elements scale proportionally at higher resolutions
- **Aspect-ratio scaling** — preview fits available space; dragging the output panel shrinks the canvas proportionally
- **Fullscreen** — enter/exit fullscreen from the preview controls; aspect ratio is preserved
- **Pop-out window** — open the preview in a separate window (drag it to a second monitor)

### UI
- **Light / dark theme** — toggle with the ☀/🌙 button; preference persisted in localStorage (default: dark)
- **Resizable output panel** — drag the top edge to resize; height persisted in localStorage
- **Output panel** — shows `print()` / `printf()` output and runtime errors with color coding
- **Compile timing** — shows how long C/C++ compilation took

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

### Python (MicroPython) — runs entirely in the browser

```
┌────────────────────────────────────────────────────────┐
│                    React App (main window)              │
│                                                        │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Monaco Editor│    │  <canvas id="lvgl-canvas">   │  │
│  │  (Python)    │    │                              │  │
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

**Execution flow:**
1. User clicks **Run** (or edits code in live mode)
2. Runner prepends a screen reset (`lv.obj(None)` + `lv.screen_load()`) to clear previous state
3. `mp_js_do_str` executes the script; LVGL draws pixels to the parent canvas — visible instantly

**Asyncify conflict prevention:**
`mp_js_do_str` and `mp_handle_pending` are both asyncified — only one can be active at a time. An `executingCode` flag pauses the ticker loop during script execution.

### C / C++ — compiled server-side via Emscripten

```
┌─────────────────────┐      ┌────────────────────────────────────┐
│   React App          │      │           Node.js Server            │
│                     │      │                                    │
│  Monaco Editor ─────┼─────▶│  emcc user_code.c                  │
│  (C/C++ code)       │      │    + LVGL source                   │
│                     │      │    + SDL2                          │
│  Output panel ◀─────┼──────│  → output.js + output.wasm         │
│  (SSE stream)       │      │  → artifact stored (TTL: 1h)       │
│                     │      └────────────────────────────────────┘
│  <iframe>           │                    │
│  ┌───────────────┐  │◀───── artifact id ─┘
│  │ c-runner.html │  │
│  │  <canvas>     │  │
│  │  output.js    │  │
│  └───────────────┘  │
└─────────────────────┘
```

**Execution flow:**
1. User clicks **Run**
2. Code is sent to the server; Emscripten compiles it (`emcc`) with LVGL and SDL2
3. Compiler output streams to the browser in real time via SSE
4. On success, the server stores the JS+WASM artifact and returns an artifact ID
5. The browser loads `c-runner.html?id=...` in a visible iframe; SDL2 renders to the iframe's canvas

| Component | Role |
|-----------|------|
| `lv_micropython` WASM | MicroPython + LVGL runtime compiled to WebAssembly |
| `emcc` (server) | Emscripten C/C++ compiler, builds LVGL + user code to WASM |
| SSE streaming | Compile output is streamed line by line to the browser |
| Artifact store | Compiled JS+WASM files stored on server with 1h TTL |
| `c-runner.html` | Iframe page that loads the compiled artifact and renders via SDL2 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- WASM files from [sim.lvgl.io](https://sim.lvgl.io) (for Python mode — see below)
- Docker + Docker Compose (for C/C++ compilation server)

### Run locally (Python mode only)

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Run with C/C++ compilation server

```bash
# Start the compilation server
cd server
docker-compose up --build

# In another terminal, start the frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the compilation server at `http://localhost:3001`.

### Build

```bash
npm run build
```

### WASM files (Python mode)

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

### MicroPython

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

### C / C++

Define `void lv_user_setup(void)` as your entry point — the simulator calls it after LVGL and SDL2 are initialized.

```c
#include "lvgl.h"

void lv_user_setup(void) {
    lv_obj_t *scr = lv_screen_active();

    lv_obj_t *btn = lv_button_create(scr);
    lv_obj_set_size(btn, 120, 50);
    lv_obj_center(btn);

    lv_obj_t *label = lv_label_create(btn);
    lv_label_set_text(label, "Hello LVGL!");
    lv_obj_center(label);
}
```

> The display, SDL2 driver, and LVGL tick are all set up automatically. Just implement `lv_user_setup`.

---

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Monaco Editor** (`@monaco-editor/react`)
- **lv_micropython** WASM — MicroPython + LVGL, compiled with Emscripten
- **Node.js** + **Emscripten** — server-side C/C++ compilation
- **Docker** — containerized Emscripten build environment

---

## License

MIT
