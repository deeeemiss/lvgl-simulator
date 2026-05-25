# LVGL WebAssembly display driver
import lvgl as lv

try:
    w = _LVGL_W
    h = _LVGL_H
except NameError:
    w, h = 480, 320

if not lv.is_initialized():
    lv.init()

lv.sdl_window_create(w, h)

try:
    lv.sdl_mouse_create()
except Exception:
    pass
