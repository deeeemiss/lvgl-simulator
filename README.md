<div align="center">

# LVGL Simulator

**Write LVGL code. See it run.**

MicroPython in the browser, instantly. C/C++ when running locally.

[![Live](https://img.shields.io/badge/try%20it-lvglsim.dev-blue?style=flat-square)](https://lvglsim.dev)
[![LVGL](https://img.shields.io/badge/LVGL-v9.2.2-brightgreen?style=flat-square)](https://lvgl.io)
[![License](https://img.shields.io/badge/license-MIT-grey?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/Python-MicroPython-yellow?style=flat-square)]()
[![C/C++](https://img.shields.io/badge/C%2FC%2B%2B-Emscripten-orange?style=flat-square)]()

[Try it live](https://lvglsim.dev) · [Features](#features) · [How it works](#how-it-works) · [Run locally](#getting-started) · [Write LVGL code](#writing-lvgl-code)

</div>

---

## Features

### Editor
- **Monaco Editor** — full VS Code experience: syntax highlighting, autocomplete, multi-cursor
- **MicroPython** — run LVGL Python code instantly via the MicroPython + LVGL WASM runtime
- **C / C++** — compile and run C/C++ LVGL code via Emscripten _(local server required — not available on lvglsim.dev)_
- **Open files** — load `.py`, `.c`, `.cpp`, `.h`, `.hpp` files directly into the editor
- **Clickable errors** — compiler errors jump to the exact line in the editor
- **Keyboard shortcuts** — see the full list with the keyboard icon button (⌘ on macOS, Ctrl on Windows/Linux)

### Preview
- **Live mode (Python)** — edits auto-run after an 800ms debounce
- **C/C++ compile & run** — compiles server-side via Emscripten; output streams live
- **Multiple resolutions** — 480×320, 800×480, 1280×720 with proportional scaling
- **Fullscreen** — aspect ratio preserved
- **Pop-out window** — drag it to a second monitor

### UI
- **Light / dark theme** — persisted in localStorage (default: dark)
- **Resizable output panel** — `print()` / `printf()` output + runtime errors, color-coded
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

## How it works

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

1. User clicks **Run** (or edits in live mode)
2. Runner prepends a screen reset to clear previous state
3. `mp_js_do_str` executes the script; LVGL draws pixels instantly

### C / C++ — compiled server-side via Emscripten

```
┌─────────────────────┐      ┌────────────────────────────────────┐
│   React App          │      │           Node.js Server            │
│                     │      │                                    │
│  Monaco Editor ─────┼─────▶│  em++ user_code.cpp                │
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

1. Code sent to server; `em++` compiles with LVGL + SDL2 — full C++ (classes, templates, STL)
2. Compiler output streams to browser in real time via SSE
3. On success, browser loads the artifact in a sandboxed iframe; SDL2 renders to canvas

| Component | Role |
|-----------|------|
| `lv_micropython` WASM | MicroPython + LVGL runtime compiled to WebAssembly |
| `em++` (server) | Emscripten C++ compiler |
| SSE streaming | Compile output streamed line by line |
| Artifact store | Compiled JS+WASM stored with 1h TTL |
| `c-runner.html` | Sandboxed iframe runner |

---

## Getting Started

### Prerequisites

- Node.js 18+
- WASM files (for Python mode — see below)
- Docker + Docker Compose (for C/C++ compilation server)

### Python mode only

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### With C/C++ compilation server

```bash
cd server && docker-compose up --build
# in another terminal:
npm install && npm run dev
```

Vite proxies `/api/*` → `http://localhost:3001`.

### Build

```bash
npm run build
```

### WASM files (Python mode)

Place in `public/wasm/`:

```
public/wasm/
  firmware.wasm        # lv_micropython compiled to WASM
  micropython.js       # Emscripten JS glue
  wasm_file_api.js     # BrowserFS file API bridge
```

---

## Writing LVGL code

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

> `lv.init()` and the display driver are initialized automatically.

### C / C++

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

> Define `void lv_user_setup(void)` as your entry point. Display, SDL2 driver, and LVGL tick are all set up automatically.

> C/C++ has no live preview — press Run after each change.

---

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Monaco Editor** (`@monaco-editor/react`)
- **lv_micropython** WASM — MicroPython + LVGL compiled with Emscripten
- **Node.js** + **Emscripten** — server-side C/C++ compilation
- **Docker** — containerized build environment

---

## License

MIT
