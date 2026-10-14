# Roadmap — LVGL Simulator

Aggiornata: 2026-10-14

## Visione
Scrivere codice LVGL nel browser e vederlo girare subito, in MicroPython e in C/C++, senza installare nulla e senza account.

## Traguardi
| # | Traguardo | Stato |
|---|---|---|
| 1 | Editor Monaco con MicroPython + LVGL in WebAssembly e anteprima dal vivo | ✅ fatto |
| 2 | Compilazione C/C++ con Emscripten tramite server locale, output in streaming | ✅ fatto |
| 3 | Online su lvglsim.dev, con C/C++ disattivato nella versione pubblica | ✅ fatto |
| 4 | Versione mobile, SEO e condivisione degli snippet via URL | ✅ fatto |
| 5 | Più file nello stesso progetto (schede in memoria, import ed export .zip) | ⬜ da fare |
| 6 | C/C++ disponibile anche su lvglsim.dev, con un server di compilazione pubblico | ⬜ da fare |

## Fuori ambito
- Backend, database o account per la condivisione: lo snippet vive tutto nell'URL.
- Un filesystem virtuale completo: per i progetti a più file bastano le schede in memoria.
