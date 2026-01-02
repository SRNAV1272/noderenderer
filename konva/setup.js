// konva/setup.js
import { createCanvas, Image, registerFont } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ESM-safe __dirname */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------
   FONT DIRECTORIES (Docker-safe)
------------------------------------------------- */
const FONT_DIRS = [
    path.join(__dirname, "Fonts"),     // local
    "/usr/share/fonts/custom",          // docker custom
    "/usr/share/fonts"                  // system
];

/* -------------------------------------------------
   Weight + style helpers
------------------------------------------------- */
const WEIGHT_KEYWORDS = [
    ["thin", "100"],
    ["extralight", "200"],
    ["ultralight", "200"],
    ["light", "300"],
    ["regular", "normal"],
    ["medium", "500"],
    ["semibold", "600"],
    ["bold", "bold"],
    ["extrabold", "800"],
    ["black", "900"]
];

function parseFontMeta(file) {
    const name = file.toLowerCase();
    let weight = "normal";
    let style = "normal";

    for (const [key, val] of WEIGHT_KEYWORDS) {
        if (name.includes(key)) {
            weight = val;
            break;
        }
    }

    if (name.includes("italic") || name.includes("oblique")) {
        style = "italic";
    }

    return { weight, style };
}

/* -------------------------------------------------
   Family normalization (PATCHED)
------------------------------------------------- */
function normalizeFamily(file) {
    return file
        .replace(/\.(ttf|otf)$/i, "")
        .replace(/[-_](thin|extralight|ultralight|light|regular|medium|semibold|bold|extrabold|black)/gi, "")
        .replace(/[-_](italic|oblique)/gi, "")
        .replace(/[,]/g, "") // 🔥 REMOVE commas
        .replace(/sans-serif|serif|cursive|monospace|handwriting|fantasy/gi, "") // 🔥 REMOVE CSS words
        .replace(/[_\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* -------------------------------------------------
   Register all fonts safely
------------------------------------------------- */
function registerAllFonts() {
    const registered = new Set();

    for (const dir of FONT_DIRS) {
        if (!fs.existsSync(dir)) continue;

        for (const file of fs.readdirSync(dir)) {
            if (!/\.(ttf|otf)$/i.test(file)) continue;

            const fontPath = path.join(dir, file);
            const family = normalizeFamily(file);
            const { weight, style } = parseFontMeta(file);

            const key = `${family}-${weight}-${style}`;
            if (registered.has(key)) continue;

            try {
                registerFont(fontPath, { family, weight, style });
                registered.add(key);
                console.log(`✅ Font loaded: ${family} (${weight}, ${style})`);
            } catch (err) {
                console.warn(`⚠️ Font skipped: ${file}`, err.message);
            }
        }
    }
}

registerAllFonts();

/* -------------------------------------------------
   Konva AFTER fonts
------------------------------------------------- */
import Konva from "konva";

Konva.pixelRatio = 1;

function createStyledCanvas(width = 1, height = 1) {
    const canvas = createCanvas(width, height);
    canvas.style = {};
    return canvas;
}

global.Image = Image;

global.document = {
    createElement: (tag) => (tag === "canvas" ? createStyledCanvas() : {})
};

global.window = { devicePixelRatio: 1 };

Konva.Util.createCanvasElement = () => createStyledCanvas();
Konva.Util.createImageElement = () => new Image();

export default Konva;
