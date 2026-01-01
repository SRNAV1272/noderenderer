import express from "express";
import cors from "cors";
import { renderSignature } from "./konva/renderSignature.js";
import { webcrypto } from "crypto";
import { updateFieldsFromCard } from "./utils/loadImageSafe.js";

const crypto = webcrypto;
const app = express();

/* --------------------------------------------------
   ✅ CORS (Express 5 compatible)
-------------------------------------------------- */
const allowedOrigin =
    process.env.NODE_ENV === "production"
        ? process.env?.CORS_ORIGIN
        : "http://localhost:3001";

app.use(
    cors({
        origin: allowedOrigin,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);


/* --------------------------------------------------
   Body parser
-------------------------------------------------- */
app.use(express.json({ limit: "10mb" }));

/* --------------------------------------------------
   Render endpoint
-------------------------------------------------- */


/* ---------------------------------------------------------
   Utilities
   --------------------------------------------------------- */

const API_URL =
    process.env.API_URL ||
    "";

const AES_KEY = process.env.AES_KEY;
const AES_IV = process.env.AES_IV;

if (!AES_KEY || !AES_IV) {
    throw new Error("❌ Missing AES_KEY or AES_IV in environment variables");
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
/* ---------------------------------------------------------
   AES Decryption Helper (Outlook-safe)
   --------------------------------------------------------- */

function handleAesDecrypt(encryptedText, generatedKey) {
    return new Promise(async (resolve) => {
        try {
            if (!encryptedText) {
                resolve("");
                return;
            }

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

            const decryptedText = new TextDecoder().decode(decryptedBuffer);
            resolve(decryptedText);

        } catch (error) {
            console.error("❌ AES decrypt failed:", error);
            // Fail-safe: return original text (never block signature flow)
            resolve(encryptedText);
        }
    });
}

async function encryptEmail(email) {
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

    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function fetchActiveSignature(encryptedEmail) {
    const res = await fetch(`${API_URL}/email-signature/outlook/get-active`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            username: encryptedEmail,
        },
    });

    if (!res.ok) {
        throw new Error("Signature API failed: " + res.status);
    }

    // ✅ ALWAYS read as text first
    const rawText = await res.text();

    let encryptedPayload;

    // ✅ If backend returned JSON string
    if (rawText.trim().startsWith("{")) {
        const parsed = JSON.parse(rawText);
        encryptedPayload = parsed?.data;
    }
    // ✅ If backend returned plain encrypted string
    else {
        encryptedPayload = rawText;
    }

    if (!encryptedPayload) {
        throw new Error("No encrypted payload received");
    }

    // ✅ Decrypt
    const decryptedText = await handleAesDecrypt(encryptedPayload);

    // ✅ Parse decrypted JSON
    const parsedData = JSON.parse(decryptedText);

    return parsedData;
}


app.post("/render-signature", async (req, res) => {
    try {

        const encryptedEmail = await encryptEmail(req?.body?.email);
        const apiResponse = await fetchActiveSignature(encryptedEmail)
        const elements = updateFieldsFromCard(apiResponse?.card, API_URL)([...apiResponse?.elements])
        const png = await renderSignature({ elements }); // ✅ Buffer
        const banner = apiResponse?.elements?.find(i => i?.key === "banner")?.link
        const formData = new FormData();
        const pngBlob = new Blob([png], { type: "image/png" });
        formData.append(
            "emailSignatureFile",
            pngBlob,
            "email-signature.png" // filename
        );

        formData.append("cardId", apiResponse?.card?.cardUUID);

        const response = await fetch(
            `${API_URL}/v1/save/email-signature`,
            {
                method: "POST",
                headers: {
                    accept: "*/*",
                    adminusername: process.env?.adminusername,
                    authorization:
                        // "Bearer YOUR_TOKEN"
                        `Bearer ${process.env?.AUTH_TOKEN}`
                    ,
                    "organization-id": process.env?.orgid,
                    username: process.env?.username,

                    // 🔴 IMPORTANT
                    // ...formData.getHeaders(),
                },
                body: formData,
            }
        );

        const data = await response.json();
        console.log({
            ...data,
            bannerFileUrl: !!banner ? banner : null
        });

        // res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        // res.send(png);
        res.json({
            ...data,
            bannerFileUrl: !!banner ? banner : null,
            elements
        });
    } catch (e) {
        console.error("❌ Render failed", e);
        res.status(500).send("Render failed");
    }
});

/* --------------------------------------------------
   Server
-------------------------------------------------- */
app.listen(4000, () => {
    console.log("🚀 Konva renderer running on port 4000");
});
