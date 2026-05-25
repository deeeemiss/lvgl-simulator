#!/usr/bin/env bash
# Pre-compiles LVGL into liblvgl.a using emscripten.
# Run once inside the Docker image (at build time).
set -euo pipefail

LVGL_DIR="${LVGL_DIR:-/lvgl}"
OUT_DIR="${OUT_DIR:-/server}"
OBJ_DIR="/tmp/lvgl_objs"
CONF="${OUT_DIR}/lv_conf.h"

echo "[build_lvgl] Collecting sources from ${LVGL_DIR}/src ..."
mkdir -p "${OBJ_DIR}"

# All .c files except platform-specific drivers we don't need
mapfile -t SOURCES < <(find "${LVGL_DIR}/src" -name '*.c' \
    ! -path '*/drivers/wayland/*' \
    ! -path '*/drivers/x11/*' \
    ! -path '*/drivers/win32/*' \
    ! -path '*/drivers/nuttx/*' \
    ! -path '*/drivers/libinput/*' \
    ! -path '*/drivers/evdev/*')

echo "[build_lvgl] ${#SOURCES[@]} source files found."

CFLAGS="-I${LVGL_DIR} -include ${CONF} -O2 -s USE_SDL=2 -DLV_CONF_SKIP=1"

for src in "${SOURCES[@]}"; do
    # Create a unique object file name based on full path
    rel="${src#${LVGL_DIR}/}"
    obj="${OBJ_DIR}/$(echo "${rel}" | tr '/' '_').o"
    emcc ${CFLAGS} -c "${src}" -o "${obj}"
done

echo "[build_lvgl] Archiving into ${OUT_DIR}/liblvgl.a ..."
emar rcs "${OUT_DIR}/liblvgl.a" "${OBJ_DIR}"/*.o
rm -rf "${OBJ_DIR}"

echo "[build_lvgl] Done."
