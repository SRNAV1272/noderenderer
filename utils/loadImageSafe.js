import { loadImage } from "canvas";

export async function loadImageSafe(src) {
    if (!src) return null;
    try {
        return await loadImage(src);
    } catch (e) {
        console.warn("⚠️ Image load failed:", src);
        return null;
    }
}
