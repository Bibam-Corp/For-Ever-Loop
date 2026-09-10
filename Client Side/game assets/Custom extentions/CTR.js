// CRT / VHS FX — TurboWarp extension
// V1 — CRT + VHS shader
// Features:
//   - Scanlines
//   - Animated noise
//   - CRT curvature
//   - RGB separation
//   - Flicker
//   - Horizontal distortion
//   - VHS tracking
//   - Jitter
//   - Vignette
//
// Requires TurboWarp unsandboxed extensions.

(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed) {
        throw new Error(
            "CRT / VHS FX doit être exécutée en mode unsandboxed."
        );
    }

    const vm = Scratch.vm;
    const renderer = vm.renderer;
    const gl = renderer.gl;

    const settings = {
        enabled: false,

        scanlines: 60,
        noise: 15,
        distortion: 10,
        rgb: 2,

        flicker: 5,
        curvature: 10,
        tracking: 10,

        jitter: 2,
        vignette: 20
    };

    let program = null;
    let texture = null;
    let vertexBuffer = null;

    let initialized = false;
    let time = 0;
    let previousTime = performance.now();

    // ============================================================
    // SHADERS
    // ============================================================

    const vertexShaderSource = `
        attribute vec2 a_position;

        varying vec2 v_uv;

        void main() {
            v_uv = (a_position + 1.0) * 0.5;

            gl_Position = vec4(
                a_position,
                0.0,
                1.0
            );
        }
    `;

    const fragmentShaderSource = `
        precision highp float;

        varying vec2 v_uv;

        uniform sampler2D u_texture;

        uniform float u_time;

        uniform float u_scanlines;
        uniform float u_noise;
        uniform float u_distortion;
        uniform float u_rgb;

        uniform float u_flicker;
        uniform float u_curvature;
        uniform float u_tracking;

        uniform float u_jitter;
        uniform float u_vignette;

        uniform vec2 u_resolution;


        // --------------------------------------------------------
        // RANDOM / NOISE
        // --------------------------------------------------------

        float random(vec2 p) {

            return fract(
                sin(
                    dot(
                        p,
                        vec2(
                            12.9898,
                            78.233
                        )
                    )
                ) * 43758.5453
            );
        }


        float noise(vec2 p) {

            vec2 i = floor(p);
            vec2 f = fract(p);

            f = f * f * (3.0 - 2.0 * f);

            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            return mix(
                mix(a, b, f.x),
                mix(c, d, f.x),
                f.y
            );
        }


        // --------------------------------------------------------
        // CRT CURVATURE
        // --------------------------------------------------------

        vec2 crtCurve(
            vec2 uv,
            float amount
        ) {

            vec2 p = uv * 2.0 - 1.0;

            float r2 = dot(p, p);

            p *= 1.0 + amount * r2;

            return p * 0.5 + 0.5;
        }


        // --------------------------------------------------------
        // VHS TRACKING
        // --------------------------------------------------------

        float trackingNoise(
            float y,
            float t
        ) {

            float a =
                sin(
                    y * 80.0 +
                    t * 7.0
                );

            float b =
                sin(
                    y * 170.0 -
                    t * 11.0
                );

            float c =
                sin(
                    y * 430.0 +
                    t * 18.0
                );

            return (
                a * 0.5 +
                b * 0.3 +
                c * 0.2
            );
        }


        // --------------------------------------------------------
        // MAIN
        // --------------------------------------------------------

        void main() {

            vec2 uv = v_uv;


            // ====================================================
            // VHS HORIZONTAL DISTORTION
            // ====================================================

            float tracking =
                trackingNoise(
                    uv.y,
                    u_time
                );

            float distortionAmount =
                u_distortion / 100.0;

            uv.x +=
                tracking *
                distortionAmount *
                0.004;


            // ====================================================
            // RANDOM VHS TRACKING BANDS
            // ====================================================

            float bandNoise =
                noise(
                    vec2(
                        floor(u_time * 3.0),
                        floor(uv.y * 25.0)
                    )
                );

            float trackingBand =
                step(
                    0.94,
                    bandNoise
                );

            uv.x +=
                trackingBand *
                sin(
                    u_time * 30.0 +
                    uv.y * 100.0
                ) *
                distortionAmount *
                0.012;


            // ====================================================
            // JITTER
            // ====================================================

            float line =
                floor(
                    uv.y *
                    u_resolution.y
                );

            uv.x +=
                sin(
                    line * 0.21 +
                    u_time * 60.0
                ) *
                0.0005 *
                u_jitter;


            // ====================================================
            // CRT CURVATURE
            // ====================================================

            uv =
                crtCurve(
                    uv,
                    u_curvature / 100.0
                );


            // ====================================================
            // RGB SEPARATION
            // ====================================================

            float rgbOffset =
                u_rgb * 0.0015;


            float red =
                texture2D(
                    u_texture,
                    uv + vec2(
                        rgbOffset,
                        0.0
                    )
                ).r;


            float green =
                texture2D(
                    u_texture,
                    uv
                ).g;


            float blue =
                texture2D(
                    u_texture,
                    uv - vec2(
                        rgbOffset,
                        0.0
                    )
                ).b;


            vec3 color =
                vec3(
                    red,
                    green,
                    blue
                );


            // ====================================================
            // SCANLINES
            // ====================================================

            float scan =
                sin(
                    uv.y *
                    u_resolution.y *
                    3.14159265
                );

            float scanStrength =
                u_scanlines / 100.0;

            color *=
                1.0 -
                scan *
                0.35 *
                scanStrength;


            // ====================================================
            // ANIMATED VHS NOISE
            // ====================================================

            float n1 =
                noise(
                    uv *
                    u_resolution *
                    0.35 +
                    u_time * 12.0
                );


            float n2 =
                noise(
                    uv *
                    u_resolution *
                    0.08 -
                    u_time * 5.0
                );


            float noiseAmount =
                u_noise / 100.0;


            color +=
                (n1 - 0.5) *
                0.30 *
                noiseAmount;


            color +=
                (n2 - 0.5) *
                0.15 *
                noiseAmount;


            // ====================================================
            // FLICKER
            // ====================================================

            float flickerWave =
                sin(
                    u_time * 45.0
                );


            float flickerAmount =
                u_flicker / 100.0;


            color *=
                1.0 +
                flickerWave *
                0.035 *
                flickerAmount;


            // ====================================================
            // VIGNETTE
            // ====================================================

            vec2 p =
                uv * 2.0 - 1.0;


            float vignette =
                1.0 -
                dot(p, p) *
                0.30 *
                (u_vignette / 100.0);


            color *=
                clamp(
                    vignette,
                    0.0,
                    1.0
                );


            // ====================================================
            // OUTSIDE CRT SCREEN
            // ====================================================

            if (
                uv.x < 0.0 ||
                uv.x > 1.0 ||
                uv.y < 0.0 ||
                uv.y > 1.0
            ) {

                color *= 0.0;
            }


            gl_FragColor =
                vec4(
                    clamp(
                        color,
                        0.0,
                        1.0
                    ),
                    1.0
                );
        }
    `;


    // ============================================================
    // WEBGL HELPERS
    // ============================================================

    function compileShader(
        type,
        source
    ) {

        const shader =
            gl.createShader(type);

        gl.shaderSource(
            shader,
            source
        );

        gl.compileShader(shader);


        if (
            !gl.getShaderParameter(
                shader,
                gl.COMPILE_STATUS
            )
        ) {

            const error =
                gl.getShaderInfoLog(
                    shader
                );

            gl.deleteShader(
                shader
            );

            throw new Error(
                "Shader error: " +
                error
            );
        }


        return shader;
    }


    function initialize() {

        if (initialized) {
            return;
        }


        const vertexShader =
            compileShader(
                gl.VERTEX_SHADER,
                vertexShaderSource
            );


        const fragmentShader =
            compileShader(
                gl.FRAGMENT_SHADER,
                fragmentShaderSource
            );


        program =
            gl.createProgram();


        gl.attachShader(
            program,
            vertexShader
        );


        gl.attachShader(
            program,
            fragmentShader
        );


        gl.linkProgram(
            program
        );


        if (
            !gl.getProgramParameter(
                program,
                gl.LINK_STATUS
            )
        ) {

            throw new Error(
                gl.getProgramInfoLog(
                    program
                )
            );
        }


        gl.deleteShader(
            vertexShader
        );

        gl.deleteShader(
            fragmentShader
        );


        // Full-screen triangle
        vertexBuffer =
            gl.createBuffer();


        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            vertexBuffer
        );


        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,

                -1,  1,
                 1, -1,
                 1,  1
            ]),
            gl.STATIC_DRAW
        );


        texture =
            gl.createTexture();


        gl.bindTexture(
            gl.TEXTURE_2D,
            texture
        );


        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR
        );


        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            gl.LINEAR
        );


        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            gl.CLAMP_TO_EDGE
        );


        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            gl.CLAMP_TO_EDGE
        );


        initialized = true;
    }


    // ============================================================
    // APPLY EFFECT
    // ============================================================

    function applyEffect() {

        if (!settings.enabled) {
            return;
        }


        initialize();


        const canvas =
            renderer.canvas;


        if (
            !canvas ||
            canvas.width <= 0 ||
            canvas.height <= 0
        ) {

            return;
        }


        const width =
            canvas.width;

        const height =
            canvas.height;


        // --------------------------------------------------------
        // SAVE GL STATE
        // --------------------------------------------------------

        const oldProgram =
            gl.getParameter(
                gl.CURRENT_PROGRAM
            );


        const oldBuffer =
            gl.getParameter(
                gl.ARRAY_BUFFER_BINDING
            );


        const oldViewport =
            gl.getParameter(
                gl.VIEWPORT
            );


        // --------------------------------------------------------
        // COPY SCREEN → TEXTURE
        // --------------------------------------------------------

        gl.bindTexture(
            gl.TEXTURE_2D,
            texture
        );


        try {

            gl.copyTexImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                0,
                0,
                width,
                height,
                0
            );

        } catch (error) {

            console.warn(
                "[CRT/VHS FX] Impossible de copier le framebuffer:",
                error
            );

            gl.useProgram(
                oldProgram
            );

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                oldBuffer
            );

            gl.viewport(
                oldViewport[0],
                oldViewport[1],
                oldViewport[2],
                oldViewport[3]
            );

            return;
        }


        // --------------------------------------------------------
        // DRAW SHADER
        // --------------------------------------------------------

        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            null
        );


        gl.viewport(
            0,
            0,
            width,
            height
        );


        gl.useProgram(
            program
        );


        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            vertexBuffer
        );


        const position =
            gl.getAttribLocation(
                program,
                "a_position"
            );


        gl.enableVertexAttribArray(
            position
        );


        gl.vertexAttribPointer(
            position,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );


        gl.activeTexture(
            gl.TEXTURE0
        );


        gl.bindTexture(
            gl.TEXTURE_2D,
            texture
        );


        gl.uniform1i(
            gl.getUniformLocation(
                program,
                "u_texture"
            ),
            0
        );


        // --------------------------------------------------------
        // TIME
        // --------------------------------------------------------

        const now =
            performance.now();


        const delta =
            Math.min(
                0.1,
                (now - previousTime) /
                1000
            );


        previousTime =
            now;


        time += delta;


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_time"
            ),
            time
        );


        // --------------------------------------------------------
        // PARAMETERS
        // --------------------------------------------------------

        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_scanlines"
            ),
            settings.scanlines
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_noise"
            ),
            settings.noise
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_distortion"
            ),
            settings.distortion
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_rgb"
            ),
            settings.rgb
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_flicker"
            ),
            settings.flicker
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_curvature"
            ),
            settings.curvature
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_tracking"
            ),
            settings.tracking
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_jitter"
            ),
            settings.jitter
        );


        gl.uniform1f(
            gl.getUniformLocation(
                program,
                "u_vignette"
            ),
            settings.vignette
        );


        gl.uniform2f(
            gl.getUniformLocation(
                program,
                "u_resolution"
            ),
            width,
            height
        );


        gl.drawArrays(
            gl.TRIANGLES,
            0,
            6
        );


        // --------------------------------------------------------
        // RESTORE STATE
        // --------------------------------------------------------

        gl.useProgram(
            oldProgram
        );


        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            oldBuffer
        );


        gl.viewport(
            oldViewport[0],
            oldViewport[1],
            oldViewport[2],
            oldViewport[3]
        );
    }


    // ============================================================
    // RENDERER HOOK
    // ============================================================

    const originalDraw =
        renderer.draw.bind(
            renderer
        );


    renderer.draw =
        function (...args) {

            const result =
                originalDraw(...args);


            if (settings.enabled) {

                try {

                    applyEffect();

                } catch (error) {

                    console.warn(
                        "[CRT/VHS FX]",
                        error
                    );
                }
            }


            return result;
        };


    // ============================================================
    // TURBOWARP EXTENSION
    // ============================================================

    class CRTVHSFX {

        getInfo() {

            return {

                id: "crtvhsfx",

                name: "CRT / VHS FX",

                color1: "#6C5CE7",
                color2: "#5747C7",
                color3: "#4637A5",

                blocks: [

                    {
                        opcode: "enable",

                        blockType:
                            Scratch.BlockType.COMMAND,

                        text:
                            "activer le filtre"
                    },


                    {
                        opcode: "disable",

                        blockType:
                            Scratch.BlockType.COMMAND,

                        text:
                            "désactiver le filtre"
                    },


                    {
                        opcode: "preset",

                        blockType:
                            Scratch.BlockType.COMMAND,

                        text:
                            "mettre le preset [PRESET]",

                        arguments: {

                            PRESET: {

                                type:
                                    Scratch.ArgumentType.STRING,

                                menu:
                                    "presets"
                            }
                        }
                    },


                    {
                        opcode: "set",

                        blockType:
                            Scratch.BlockType.COMMAND,

                        text:
                            "mettre [EFFECT] à [VALUE]",

                        arguments: {

                            EFFECT: {

                                type:
                                    Scratch.ArgumentType.STRING,

                                menu:
                                    "effects"
                            },

                            VALUE: {

                                type:
                                    Scratch.ArgumentType.NUMBER,

                                defaultValue:
                                    50
                            }
                        }
                    },


                    {
                        opcode: "change",

                        blockType:
                            Scratch.BlockType.COMMAND,

                        text:
                            "ajouter [VALUE] à [EFFECT]",

                        arguments: {

                            EFFECT: {

                                type:
                                    Scratch.ArgumentType.STRING,

                                menu:
                                    "effects"
                            },

                            VALUE: {

                                type:
                                    Scratch.ArgumentType.NUMBER,

                                defaultValue:
                                    5
                            }
                        }
                    },


                    {
                        opcode: "get",

                        blockType:
                            Scratch.BlockType.REPORTER,

                        text:
                            "[EFFECT]",

                        arguments: {

                            EFFECT: {

                                type:
                                    Scratch.ArgumentType.STRING,

                                menu:
                                    "effects"
                            }
                        }
                    }
                ],


                menus: {

                    presets: {

                        acceptReporters:
                            false,

                        items: [
                            "CRT",
                            "VHS",
                            "VHS HORROR",
                            "SECURITY CAMERA",
                            "OFF"
                        ]
                    },


                    effects: {

                        acceptReporters:
                            false,

                        items: [

                            "scanlines",
                            "noise",
                            "distortion",
                            "RGB",
                            "flicker",
                            "curvature",
                            "tracking",
                            "jitter",
                            "vignette"

                        ]
                    }
                }
            };
        }


        // ========================================================
        // BASIC
        // ========================================================

        enable() {

            settings.enabled =
                true;

            renderer.dirty =
                true;
        }


        disable() {

            settings.enabled =
                false;

            renderer.dirty =
                true;
        }


        // ========================================================
        // PRESETS
        // ========================================================

        preset(args) {

            const preset =
                String(
                    args.PRESET
                ).toUpperCase();


            // ----------------------------------------------------
            // CRT
            // ----------------------------------------------------

            if (preset === "CRT") {

                Object.assign(
                    settings,
                    {

                        enabled: true,

                        scanlines: 75,
                        noise: 8,
                        distortion: 2,
                        rgb: 2,

                        flicker: 3,
                        curvature: 15,
                        tracking: 0,

                        jitter: 0,
                        vignette: 25
                    }
                );
            }


            // ----------------------------------------------------
            // VHS
            // ----------------------------------------------------

            else if (
                preset === "VHS"
            ) {

                Object.assign(
                    settings,
                    {

                        enabled: true,

                        scanlines: 35,
                        noise: 35,
                        distortion: 18,
                        rgb: 4,

                        flicker: 8,
                        curvature: 5,
                        tracking: 35,

                        jitter: 8,
                        vignette: 12
                    }
                );
            }


            // ----------------------------------------------------
            // VHS HORROR
            // ----------------------------------------------------

            else if (
                preset === "VHS HORROR"
            ) {

                Object.assign(
                    settings,
                    {

                        enabled: true,

                        scanlines: 60,
                        noise: 55,
                        distortion: 35,
                        rgb: 7,

                        flicker: 20,
                        curvature: 10,
                        tracking: 70,

                        jitter: 20,
                        vignette: 35
                    }
                );
            }


            // ----------------------------------------------------
            // SECURITY CAMERA
            // ----------------------------------------------------

            else if (
                preset === "SECURITY CAMERA"
            ) {

                Object.assign(
                    settings,
                    {

                        enabled: true,

                        scanlines: 80,
                        noise: 25,
                        distortion: 10,
                        rgb: 1,

                        flicker: 15,
                        curvature: 5,
                        tracking: 15,

                        jitter: 4,
                        vignette: 45
                    }
                );
            }


            // ----------------------------------------------------
            // OFF
            // ----------------------------------------------------

            else if (
                preset === "OFF"
            ) {

                settings.enabled =
                    false;
            }


            renderer.dirty =
                true;
        }


        // ========================================================
        // SET
        // ========================================================

        set(args) {

            const key =
                this.normalizeEffect(
                    args.EFFECT
                );


            if (!key) {
                return;
            }


            let value =
                Number(
                    args.VALUE
                );


            if (
                !Number.isFinite(
                    value
                )
            ) {

                value = 0;
            }


            // RGB is deliberately allowed
            // to use a smaller range.

            const max =
                key === "rgb"
                    ? 20
                    : 100;


            settings[key] =
                Math.max(
                    0,
                    Math.min(
                        max,
                        value
                    )
                );


            renderer.dirty =
                true;
        }


        // ========================================================
        // CHANGE
        // ========================================================

        change(args) {

            const key =
                this.normalizeEffect(
                    args.EFFECT
                );


            if (!key) {
                return;
            }


            let value =
                Number(
                    args.VALUE
                );


            if (
                !Number.isFinite(
                    value
                )
            ) {

                value = 0;
            }


            const max =
                key === "rgb"
                    ? 20
                    : 100;


            settings[key] =
                Math.max(
                    0,
                    Math.min(
                        max,
                        settings[key] +
                        value
                    )
                );


            renderer.dirty =
                true;
        }


        // ========================================================
        // GET
        // ========================================================

        get(args) {

            const key =
                this.normalizeEffect(
                    args.EFFECT
                );


            if (!key) {
                return 0;
            }


            return settings[key];
        }


        // ========================================================
        // NORMALIZE EFFECT
        // ========================================================

        normalizeEffect(effect) {

            const e =
                String(
                    effect
                )
                .toLowerCase()
                .trim();


            const map = {

                "scanlines":
                    "scanlines",

                "noise":
                    "noise",

                "distortion":
                    "distortion",

                "rgb":
                    "rgb",

                "flicker":
                    "flicker",

                "curvature":
                    "curvature",

                "tracking":
                    "tracking",

                "jitter":
                    "jitter",

                "vignette":
                    "vignette"
            };


            return (
                map[e] ||
                null
            );
        }
    }


    Scratch.extensions.register(
        new CRTVHSFX()
    );

})(Scratch);

//ChatGPT codex