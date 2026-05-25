/**
 * LVGL emscripten template — wraps user code.
 *
 * User code must define:
 *   void lv_user_setup(void);
 *
 * If the user provides a full main(), define LV_USER_HAS_MAIN and the
 * template main() is excluded.
 */
#include "lvgl.h"
#include <SDL2/SDL.h>
#include <emscripten.h>
#include <stdio.h>

#ifndef DISP_HOR_RES
  #define DISP_HOR_RES 480
#endif
#ifndef DISP_VER_RES
  #define DISP_VER_RES 320
#endif

/* Forward declaration — provided by user_code.c */
extern void lv_user_setup(void);

static uint32_t last_tick;

static void main_loop(void) {
    uint32_t now = SDL_GetTicks();
    lv_tick_inc(now - last_tick);
    last_tick = now;
    lv_timer_handler();
}

int main(void) {
    lv_init();
    lv_sdl_window_create(DISP_HOR_RES, DISP_VER_RES);

    last_tick = SDL_GetTicks();

    /* Run user setup code */
    lv_user_setup();

    /* Signal to the parent frame that rendering started */
    EM_ASM({
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'status', status: 'running' }, '*');
        }
    });

    emscripten_set_main_loop(main_loop, 0, 1);
    return 0;
}
