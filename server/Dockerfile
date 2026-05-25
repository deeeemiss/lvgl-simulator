# Stage 1: build LVGL static lib with emscripten
FROM emscripten/emsdk:3.1.60 AS lvgl-builder

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Clone LVGL v9.2
RUN git clone --depth 1 --branch v9.2.2 https://github.com/lvgl/lvgl.git /lvgl

WORKDIR /server
COPY lv_conf.h    /server/lv_conf.h
COPY build_lvgl.sh /server/build_lvgl.sh
RUN /server/build_lvgl.sh

# Stage 2: runtime image
FROM emscripten/emsdk:3.1.60

# Copy LVGL source (headers needed at compile time) and pre-built lib
COPY --from=lvgl-builder /lvgl   /lvgl
COPY --from=lvgl-builder /server/liblvgl.a /server/liblvgl.a

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /server

COPY package.json      /server/package.json
RUN npm install --production

COPY index.js          /server/index.js
COPY template_main.c   /server/template_main.c
COPY lv_conf.h         /server/lv_conf.h

EXPOSE 3001
CMD ["node", "index.js"]
