import express from "express";
import cors from "cors";
import { renderSignature } from "./konva/renderSignature.js";
import fs from "fs";
import { webcrypto } from "crypto";
import { Blob } from "buffer";
import { updateFieldsFromCard } from "./utils/loadImageSafe.js";

const crypto = webcrypto;
const app = express();

/* --------------------------------------------------
   ✅ CORS (Express 5 compatible)
-------------------------------------------------- */
app.use(
    cors({
        origin: "http://localhost:3001",
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
    "https://newqa-enterprise.cardbyte.ai/email-signature/outlook/get-active";

const AES_KEY = "fnItrY2YfozBqCC2B4XsfqHIvZku3kUOq3DFkbO64kk=";
const AES_IV = "3YapeNfJDung7TXxeKXn4g==";

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
    const res = await fetch(API_URL, {
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
        const elements = updateFieldsFromCard(apiResponse?.card, "https://newqa-enterprise.cardbyte.ai")([...apiResponse?.elements])
        const png = await renderSignature({ elements }); // ✅ Buffer

        // const formData = new FormData();
        // const pngBlob = new Blob([png], { type: "image/png" });
        // formData.append(
        //     "emailSignatureFile",
        //     pngBlob,
        //     "email-signature.png" // filename
        // );

        // formData.append("cardId", "1c9f432b-9623-455a-b643-836422d45a8b");

        // const apiResponse = await fetch(
        //     "https://newqa-enterprise.cardbyte.ai/v1/save/email-signature",
        //     {
        //         method: "POST",
        //         headers: {
        //             accept: "*/*",
        //             adminusername: "sairajesh.korla1272@outlook.com",
        //             authorization:
        //                 // "Bearer YOUR_TOKEN"
        //                 "Bearer eyJhbGciOiJIUzUxMiJ9.eyJvcmdhbml6YXRpb25JZCI6IkNCLU9SRy0xMTA2MjAyNTI2ODE3MzQ5IiwiZGV2aWNlVHlwZSI6IldFQiIsInN1YiI6InNhaXJhamVzaC5rb3JsYTEyNzJAb3V0bG9vay5jb20iLCJhY2NvdW50VHlwZSI6IkFETUlOIiwibG9naW5UaW1lc3RhbXAiOnsiaG91ciI6MTQsIm1pbnV0ZSI6MzgsInNlY29uZCI6MSwiZGF5T2ZZZWFyIjozNjUsImRheU9mV2VlayI6IldFRE5FU0RBWSIsIm1vbnRoIjoiREVDRU1CRVIiLCJkYXlPZk1vbnRoIjozMSwieWVhciI6MjAyNSwibW9udGhWYWx1ZSI6MTIsIm5hbm8iOjIyODAwMDAwMCwiY2hyb25vbG9neSI6eyJjYWxlbmRhclR5cGUiOiJpc284NjAxIiwiaWQiOiJJU08ifX0sImV4cCI6MTc2NzE3OTI4MSwiZGV2aWNlSWQiOiJtanRzbXA2c2Ywd3g5dHEwdiIsImlhdCI6MTc2NzE3MjA4MSwidW5pcXVlTG9naW5JZCI6ImFiMjBkYjQ3LWIzNmQtNGUyMS05NDk4LWM4YzJhYjA5NmM3N0NCLU9SRy0xMTA2MjAyNTI2ODE3MzQ5IiwidXNlcm5hbWUiOiJzYWlyYWplc2gua29ybGExMjcyQG91dGxvb2suY29tIn0.5pHli4LuwtuhtFDJZecZyTQqvfUY6An12WigGTM5dIVWfob6Vg2sgRxvUwhj-hg8mDiAuQQtL05vK1sC04wp4g"
        //             ,
        //             "organization-id": "tBfrXzCg2cTSYVWhEBGrRcn2sLrTrF1NBOBV21JWJQM=",
        //             username: "dzwX15mKvMkIDY35q038GJ2IWz7y//AcEk7T5aa13x0=",

        //             // 🔴 IMPORTANT
        //             // ...formData.getHeaders(),
        //         },
        //         body: formData,
        //     }
        // );

        // const data = await apiResponse.json();
        // console.log(data);

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        res.send(png);
        // res.json(data);
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
