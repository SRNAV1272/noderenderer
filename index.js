import express from "express";
import cors from "cors";
import { renderSignature } from "./konva/renderSignature.js";

const app = express();

/* --------------------------------------------------
   ✅ CORS (Express 5 compatible)
-------------------------------------------------- */
app.use(
    cors({
        origin: "http://localhost:3000",
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
app.post("/render-signature", async (req, res) => {
    try {
        const png = await renderSignature(req.body);

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        res.send(png);
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
