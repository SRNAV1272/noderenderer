import { Image } from "canvas";

export async function loadImage(url) {
    if (!url) return null;

    console.log("🖼️ loadImage:", url);

    /* --------------------------------------------------
       ✅ CASE 1: Base64 image (BEST)
    -------------------------------------------------- */
    if (url.startsWith("data:image")) {
        const base64 = url.split(",")[1];
        const buffer = Buffer.from(base64, "base64");

        const img = new Image();
        img.src = buffer;
        return img;
    }

    /* --------------------------------------------------
       🔁 CASE 2: Replace localhost with public domain
    -------------------------------------------------- */
    let fetchUrl = url;

    if (url.includes("localhost")) {
        fetchUrl = url
            .replace("http://localhost:3000", "https://newqa-enterprise.cardbyte.ai")
            .replace("https://localhost:3000", "https://newqa-enterprise.cardbyte.ai")
            .replace("http://localhost", "https://newqa-enterprise.cardbyte.ai")
            .replace("https://localhost", "https://newqa-enterprise.cardbyte.ai");

        console.warn("🔁 URL rewritten:", fetchUrl);
    }

    /* --------------------------------------------------
       ✅ CASE 3: Fetch public URL
    -------------------------------------------------- */
    const res = await fetch(fetchUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch image: ${fetchUrl}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    const img = new Image();
    img.src = buffer;

    return img;
}
