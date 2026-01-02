import { Image } from "canvas";

export async function loadImage(url) {
    try {
        if (!url || !url.trim()) return null;

        let buffer;

        // --------------------------------------------------
        // ✅ Base64
        // --------------------------------------------------
        if (url.startsWith("data:image")) {
            buffer = Buffer.from(url.split(",")[1], "base64");
        } else {
            let fetchUrl = url;

            if (url.includes("localhost")) {
                fetchUrl = url
                    .replace("http://localhost:3000", process.env.API_URL)
                    .replace("https://localhost:3000", process.env.API_URL)
                    .replace("http://localhost", process.env.API_URL)
                    .replace("https://localhost", process.env.API_URL);
            }

            const res = await fetch(fetchUrl);
            if (!res.ok) return null;

            buffer = Buffer.from(await res.arrayBuffer());
        }

        // --------------------------------------------------
        // 🔒 WAIT FOR DECODE (SAFE)
        // --------------------------------------------------
        const img = new Image();

        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => resolve(); // ⛔ swallow error
            img.src = buffer;
        });

        // --------------------------------------------------
        // ✅ FINAL SAFETY CHECK
        // --------------------------------------------------
        if (!img.width || !img.height) return null;

        return img;
    } catch (err) {
        console.warn("⚠️ loadImage skipped:", err.message);
        return null;
    }
}
