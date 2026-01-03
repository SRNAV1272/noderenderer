import { Image } from "canvas";

/* --------------------------------
   GLOBAL IMAGE CACHE
-------------------------------- */

const imageCache = new Map(); // key → Image
const MAX_CACHE_SIZE = 100;

/* --------------------------------
   Helper: Cache control
-------------------------------- */

function setCache(key, value) {
    if (imageCache.size >= MAX_CACHE_SIZE) {
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
    }
    imageCache.set(key, value);
}

/* --------------------------------
   OPTIMIZED IMAGE LOADER
-------------------------------- */

export async function loadImage(url) {
    try {
        if (!url || !url.trim()) return null;

        // ✅ CACHE HIT
        if (imageCache.has(url)) {
            return imageCache.get(url);
        }

        let buffer;

        /* --------------------------------
           BASE64 (FAST PATH)
        -------------------------------- */
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

        /* --------------------------------
           DECODE IMAGE (ONCE)
        -------------------------------- */
        const img = new Image();

        await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // swallow errors
            img.src = buffer;
        });

        if (!img.width || !img.height) return null;

        // ✅ STORE IN CACHE
        setCache(url, img);

        return img;
    } catch (err) {
        console.warn("⚠️ loadImage skipped:", err.message);
        return null;
    }
}
