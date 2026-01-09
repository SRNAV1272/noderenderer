import Konva from "../setup.js";
import QRCode from "qrcode";
import { createCanvas } from "canvas";

/**
 * High-quality, always-scannable QR renderer
 */
export async function renderQRCode({
    x = 0,
    y = 0,
    size = 70,        // DISPLAY size
    value,
    fgColor = "#000000",
    bgColor = "#ffffff",
    scale = 8        // INTERNAL render scale
}) {
    const renderSize = size * scale;

    // 1️⃣ Create high-res canvas
    const canvas = createCanvas(renderSize, renderSize);

    // 2️⃣ Render QR at high resolution
    await QRCode.toCanvas(canvas, value, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: renderSize,
        color: {
            dark: fgColor,
            light: bgColor
        }
    });

    // 3️⃣ Downscale cleanly in Konva
    return new Konva.Image({
        x,
        y,
        image: canvas,
        width: size,
        height: size,
        listening: false
    });
}
