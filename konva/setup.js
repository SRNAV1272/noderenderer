// konva/setup.js
import { createCanvas, Image, registerFont } from "canvas";
import Konva from "konva";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ESM-safe __dirname */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT_DIR = path.join(__dirname, "Fonts");

// function registerAllFonts(dir) {
//     if (!fs.existsSync(dir)) {
//         console.warn("⚠️ Font directory not found:", dir);
//         return;
//     }

//     const files = fs.readdirSync(dir);

//     files.forEach((file) => {
//         if (!file.toLowerCase().endsWith(".ttf")) return;

//         const fontPath = path.join(dir, file);

//         const family = file
//             .replace(".ttf", "")
//             .replace(/_/g, " ")
//             .replace(/\b\w/g, (c) => c.toUpperCase());

//         try {
//             registerFont(fontPath, {
//                 family,
//                 weight: "normal",
//                 style: "normal"
//             });

//             console.log("✅ Registered font:", family);
//         } catch (err) {
//             console.warn("⚠️ Skipped invalid font:", file);
//         }
//     });
// }

function parseFontMeta(fileName) {
    const name = fileName.toLowerCase();

    let weight = "normal";
    let style = "normal";

    if (name.includes("black")) weight = "900";
    else if (name.includes("bold")) weight = "bold";

    if (name.includes("italic")) style = "italic";

    return { weight, style };
}

function cleanFamilyName(fileName) {
    const lower = fileName.toLowerCase();

    // 🔥 FORCE Arial variants into ONE family
    if (lower.startsWith("arial")) {
        return "Arial";
    }

    // default behavior for others (Book Antiqua etc.)
    return fileName
        .replace(/\.(ttf|otf)$/i, "")
        .replace(/[-_]?bolditalic/i, "")
        .replace(/[-_]?bold/i, "")
        .replace(/[-_]?italic/i, "")
        .replace(/[-_]?regular/i, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

function registerAllFonts(dir) {
    if (!fs.existsSync(dir)) {
        console.warn("⚠️ Font directory not found:", dir);
        return;
    }

    fs.readdirSync(dir).forEach((file) => {
        if (!/\.(ttf|otf)$/i.test(file)) return;

        const fontPath = path.join(dir, file);
        const family = cleanFamilyName(file);
        const { weight, style } = parseFontMeta(file);

        try {
            registerFont(fontPath, { family, weight, style });
            console.log(`✅ Registered: ${family} (${weight}, ${style})`);
        } catch (err) {
            console.warn("⚠️ Failed font:", file, err.message);
        }
    });
}

registerAllFonts(FONT_DIR);

/* Konva setup */
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
