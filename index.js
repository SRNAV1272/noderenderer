import express from "express";
import cors from "cors";
import { renderSignature } from "./konva/renderSignature.js";
import { webcrypto } from "crypto";
import { updateFieldsFromCard } from "./utils/loadImageSafe.js";
import { Blob } from "buffer";
import { performance } from "perf_hooks";

const crypto = webcrypto;
const app = express();

/* --------------------------------------------------
   ✅ CORS
-------------------------------------------------- */
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);

/* --------------------------------------------------
   Body parser
-------------------------------------------------- */
app.use(express.json({ limit: "10mb" }));

/* --------------------------------------------------
   ENV (DO NOT CRASH POD)
-------------------------------------------------- */
const API_URL = process.env.API_URL || "";
const AES_KEY = process.env.AES_KEY;
const AES_IV = process.env.AES_IV;

if (!AES_KEY || !AES_IV) {
    console.error("❌ Missing AES_KEY or AES_IV (server running in degraded mode)");
}

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
function base64ToArrayBuffer(base64 = "") {
    try {
        const binary = Buffer.from(base64, "base64");
        return binary.buffer.slice(
            binary.byteOffset,
            binary.byteOffset + binary.byteLength
        );
    } catch {
        return new ArrayBuffer(0);
    }
}

/* --------------------------------------------------
   AES Decrypt (FAIL SAFE)
-------------------------------------------------- */
async function handleAesDecrypt(encryptedText, generatedKey) {
    try {
        if (!encryptedText) return "";

        const keyBuffer = await crypto.subtle.importKey(
            "raw",
            base64ToArrayBuffer(generatedKey || AES_KEY),
            { name: "AES-CBC" },
            false,
            ["decrypt"]
        );

        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: base64ToArrayBuffer(AES_IV),
            },
            keyBuffer,
            base64ToArrayBuffer(encryptedText)
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
        console.error("❌ AES decrypt failed:", err);
        return encryptedText; // NEVER throw
    }
}

async function encryptEmail(email = "") {
    try {
        const key = await crypto.subtle.importKey(
            "raw",
            base64ToArrayBuffer(AES_KEY),
            { name: "AES-CBC" },
            false,
            ["encrypt"]
        );

        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-CBC", iv: base64ToArrayBuffer(AES_IV) },
            key,
            new TextEncoder().encode(email)
        );

        return Buffer.from(encrypted).toString("base64");
    } catch (err) {
        console.error("❌ Email encryption failed:", err);
        return "";
    }
}

/* --------------------------------------------------
   Fetch Signature (TIMEOUT SAFE)
-------------------------------------------------- */
async function fetchWithRetry(encryptedEmail, retries = 1) {
    try {
        console.log("🔁 trying signature fetch...");
        return await fetchActiveSignature(encryptedEmail);
    } catch (err) {
        if (retries > 0 && err.message.includes("timeout")) {
            console.warn("🔁 trying signature fetch...");
            return fetchWithRetry(encryptedEmail, retries - 1);
        }
        throw err;
    }
}

async function fetchActiveSignature(encryptedEmail) {
    const controller = new AbortController();
    // setTimeout(() => controller.abort(), 10000);
    console.log("✅ Fetched signature data for:", encryptedEmail)
    const res = await fetch(`${API_URL}/email-signature/outlook/get-active`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            username: encryptedEmail,
        },
        signal: controller.signal,
    });

    if (!res.ok) {
        throw new Error(`Signature API failed: ${res.status}`);
    }

    const rawText = await res.text();

    let encryptedPayload;
    if (rawText.trim().startsWith("{")) {
        encryptedPayload = JSON.parse(rawText)?.data;
    } else {
        encryptedPayload = rawText;
    }

    if (!encryptedPayload) {
        throw new Error("Empty encrypted payload");
    }

    const decryptedText = await handleAesDecrypt(encryptedPayload);
    return JSON.parse(decryptedText);
}

/* --------------------------------------------------
   Render Endpoint
-------------------------------------------------- */
// app.post("/render-signature", async (req, res, next) => {
//     try {
//         const t0 = performance.now(); // total start
//         const tEncryptStart = performance.now();
//         const encryptedEmail = await encryptEmail(req?.body?.email);
//         const tEncryptEnd = performance.now();
//         // const apiResponse = await fetchActiveSignature(encryptedEmail);
//         const apiResponse = await fetchWithRetry(encryptedEmail, 2);
//         console.log("✅ Fetched signature data for:", apiResponse)
//         const elements = updateFieldsFromCard(
//             apiResponse?.card,
//             API_URL
//         )([...apiResponse?.elements]);

//         const png = await renderSignature({ elements });

//         const banner =
//             apiResponse?.elements?.find(i => i?.key === "banner")?.link || null;

//         const formData = new FormData();
//         formData.append(
//             "emailSignatureFile",
//             new Blob([png], { type: "image/png" }),
//             "email-signature.png"
//         );
//         formData.append("cardId", apiResponse?.card?.cardUUID);

//         const saveRes = await fetch(`${API_URL}/v1/save/email-signature`, {
//             method: "POST",
//             headers: {
//                 accept: "*/*",
//                 adminusername: process.env.ADMIN,
//                 authorization: `Bearer ${process.env.AUTH_TOKEN}`,
//                 organizationid: process.env.ORGID,
//                 username: process.env.CB_USERNAME,
//             },
//             body: formData,
//         });

//         let data = {};
//         try {
//             data = await saveRes.json();
//         } catch (err) {
//             next(new Error("Failed to parse save response JSON"));
//         }

//         res.setHeader("Cache-Control", "no-store");
//         res.json({
//             ...data,
//             bannerFileUrl: banner,
//             elements,
//         });
//     } catch (err) {
//         console.error("❌ Render failed:", err);
//         next(new Error("Failed to render signature"));
//     }
// });


app.post("/render-signature", async (req, res, next) => {
    const t0 = performance.now(); // total start

    try {
        // ----------------------------
        // Encrypt email
        // ----------------------------
        const tEncryptStart = performance.now();
        const encryptedEmail = await encryptEmail(req?.body?.email);
        const tEncryptEnd = performance.now();

        // ----------------------------
        // Fetch signature
        // ----------------------------
        const tFetchStart = performance.now();
        const apiResponse = await fetchWithRetry(encryptedEmail, 2);
        const tFetchEnd = performance.now();

        // ----------------------------
        // Prepare elements
        // ----------------------------
        const tElementsStart = performance.now();
        const elements = updateFieldsFromCard(
            apiResponse?.card,
            API_URL
        )([...apiResponse?.elements]);
        const tElementsEnd = performance.now();

        // ----------------------------
        // Render PNG (MOST IMPORTANT)
        // ----------------------------
        const tRenderStart = performance.now();
        const png = await renderSignature({ elements });
        const tRenderEnd = performance.now();

        // ----------------------------
        // Upload PNG
        // ----------------------------
        const tUploadStart = performance.now();

        const banner =
            apiResponse?.elements?.find(i => i?.key === "banner")?.link || null;

        const formData = new FormData();
        formData.append(
            "emailSignatureFile",
            new Blob([png], { type: "image/png" }),
            "email-signature.png"
        );
        formData.append("cardId", apiResponse?.card?.cardUUID);

        const saveRes = await fetch(`${API_URL}/v1/save/email-signature`, {
            method: "POST",
            headers: {
                accept: "*/*",
                adminusername: process.env.ADMIN,
                authorization: `Bearer ${process.env.AUTH_TOKEN}`,
                organizationid: process.env.ORGID,
                username: process.env.CB_USERNAME,
            },
            body: formData,
        });

        let data = {};
        try {
            data = await saveRes.json();
        } catch {
            throw new Error("Failed to parse save response JSON");
        }

        const tUploadEnd = performance.now();
        const t1 = performance.now(); // total end

        // ----------------------------
        // ⏱️ LOG TIMINGS
        // ----------------------------
        console.table({
            "Encrypt email (ms)": (tEncryptEnd - tEncryptStart).toFixed(2),
            "Fetch signature (ms)": (tFetchEnd - tFetchStart).toFixed(2),
            "Prepare elements (ms)": (tElementsEnd - tElementsStart).toFixed(2),
            "Render PNG (ms)": (tRenderEnd - tRenderStart).toFixed(2),
            "Upload PNG (ms)": (tUploadEnd - tUploadStart).toFixed(2),
            "TOTAL API time (ms)": (t1 - t0).toFixed(2)
        });

        res.setHeader("Cache-Control", "no-store");
        res.json({
            ...data,
            bannerFileUrl: banner,
            elements,
        });
    } catch (err) {
        console.error("❌ Render failed:", err);
        next(new Error("Failed to render signature"));
    }
});

/* --------------------------------------------------
   Express Error Handler (MUST BE LAST)
-------------------------------------------------- */
app.use((err, req, res, next) => {
    res.status(500).json({
        success: false,
        message: err?.message || "Internal Server Error",
    });
});

/* --------------------------------------------------
   Node Crash Guards (K8s SAFE)
-------------------------------------------------- */
process.on("unhandledRejection", err => {
    console.error("🔥 Unhandled Rejection:", err);
});

process.on("uncaughtException", err => {
    console.error("💥 Uncaught Exception:", err);
});

/* --------------------------------------------------
   Server
-------------------------------------------------- */
app.listen(4000, () => {
    console.log("🚀 Konva renderer running on port 4000");
});
