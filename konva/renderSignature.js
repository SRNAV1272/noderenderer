import Konva from "./setup.js";
import { renderIcon } from "./icons/index.js";
import { loadImage } from "./loadImage.js";
import { renderQRCode } from "./qr/renderQrCode.js";
import { createCanvas, Image } from "canvas";
import crypto from "crypto";

/* --------------------------------
   GLOBAL BACKGROUND RESIZE CACHE
-------------------------------- */

const resizedBgCache = new Map();

/* --------------------------------
   Helpers
-------------------------------- */

function resolveAlign(field) {
    if (field.align === "start") return "left";
    return field.align || "left";
}

function resolveFontStyle(field) {
    const weight = field.fontWeight || 400;
    const style = field.fontStyle || "normal";
    return `${weight} ${style}`.trim();
}

function getGroupedText(allFields, options, key) {
    const childKeys = options?.[key];
    if (!Array.isArray(childKeys)) return "";

    const parent = allFields.find(f => f.key === key);
    if (!parent?.show) return "";

    if (key === "fullName") return parent.value || "";

    return childKeys
        .map(childKey => {
            const f = allFields.find(x => x.key === childKey);
            return f?.show ? f.value : "";
        })
        .filter(Boolean)
        .join(parent.separator || ", ");
}

function safeAddImage(layer, config) {
    try {
        if (!config?.image) return;
        layer.add(new Konva.Image(config));
    } catch { }
}

/* --------------------------------
   Resize + Cache Background (OPTIMIZED)
-------------------------------- */

async function getResizedBackgroundFromImage(
    img,
    imgHash,
    src,
    width,
    height,
    radius = 12
) {
    const cacheKey = `${src}_${imgHash}_${width}_${height}_${radius}`;

    if (resizedBgCache.has(cacheKey)) {
        return resizedBgCache.get(cacheKey);
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, 0, 0, width, height);

    resizedBgCache.set(cacheKey, canvas);
    return canvas;
}

/* --------------------------------
   MAIN RENDERER
-------------------------------- */

export async function renderSignature({ elements }) {

    /* --------------------------------
       CONFIG
    -------------------------------- */

    const BASE_WIDTH = 336;
    const EXPORT_SCALE = 2;

    const signatureMeta = elements.find(el => el.key === "signatureName");
    const ratio =
        signatureMeta?.width && signatureMeta?.height
            ? signatureMeta.width / signatureMeta.height
            : 7 / 4;

    const stageWidth = BASE_WIDTH;
    const stageHeight = Math.round(BASE_WIDTH / ratio);

    const OUTPUT_WIDTH = Math.round(stageWidth * EXPORT_SCALE);
    const OUTPUT_HEIGHT = Math.round(stageHeight * EXPORT_SCALE);

    const options = {
        fullName: ["prefix", "firstName", "lastName"],
        website: ["website"],
        companyName: ["companyName"],
        designation: ["designation"],
        email: ["email", "email1", "email2"],
        mobileNumber: ["mobileNumber", "mobileNumber1", "mobileNumber2"],
        landlineNumber: ["landlineNumber", "landlineNumber1", "landlineNumber2"],
        fax: ["fax", "fax1"],
        addressLine1: [
            "addressLine1",
            "addressLine2",
            "city",
            "state",
            "country",
            "pincode"
        ]
    };

    /* --------------------------------
       PRELOAD ALL IMAGES (USING OPTIMIZED loadImage)
    -------------------------------- */

    const imageCache = new Map();

    await Promise.all(
        elements.map(async field => {
            if (!field.show) return;

            if (["logo", "profilePhoto", "backgroundImage"].includes(field.key)) {
                const src = field.link || field.value;
                if (!src) return;

                const img = await loadImage(src);
                if (!img) return;

                // 🔑 Hash image content
                const hash = crypto
                    .createHash("sha1")
                    .update(img.src)
                    .digest("hex");

                imageCache.set(field.key, {
                    img,
                    hash,
                    src // 👈 IMPORTANT
                });
            }
        })
    );

    /* --------------------------------
       STAGE (FINAL OUTPUT SIZE)
    -------------------------------- */

    const stage = new Konva.Stage({
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        listening: false
    });

    const backgroundLayer = new Konva.Layer({ listening: false });
    const shapeLayer = new Konva.Layer({
        listening: false,
        scaleX: EXPORT_SCALE,
        scaleY: EXPORT_SCALE
    });
    const imageLayer = new Konva.Layer({
        listening: false,
        scaleX: EXPORT_SCALE,
        scaleY: EXPORT_SCALE
    });
    const textLayer = new Konva.Layer({
        listening: false,
        scaleX: EXPORT_SCALE,
        scaleY: EXPORT_SCALE
    });

    stage.add(backgroundLayer, shapeLayer, imageLayer, textLayer);

    /* --------------------------------
       BACKGROUND (CRISP + FAST)
    -------------------------------- */

    const bgColor = elements.find(e => e.key === "backgroundColor");
    const bgEntry = imageCache.get("backgroundImage");

    if (bgEntry) {
        const resizedBg = await getResizedBackgroundFromImage(
            bgEntry.img,
            bgEntry.hash,
            bgEntry.src,
            OUTPUT_WIDTH,
            OUTPUT_HEIGHT
        );

        backgroundLayer.add(
            new Konva.Image({
                image: resizedBg,
                x: 0,
                y: 0,
                width: OUTPUT_WIDTH,
                height: OUTPUT_HEIGHT,
                listening: false
            })
        );
    } else {
        backgroundLayer.add(
            new Konva.Rect({
                x: 0,
                y: 0,
                width: OUTPUT_WIDTH,
                height: OUTPUT_HEIGHT,
                fill: bgColor?.value || "#ffffff",
                cornerRadius: 8,
                listening: false
            })
        );
    }

    /* --------------------------------
       SHAPES
    -------------------------------- */

    for (const field of elements) {
        if (!field.show || !field.shapeType) continue;

        if (field.shapeType === "circle") {
            shapeLayer.add(new Konva.Circle({
                x: field.position.x,
                y: field.position.y,
                radius: field.radius || 10,
                fill: field.fill || "#ccc",
                listening: false
            }));
        } else if (field.shapeType === "rect") {
            shapeLayer.add(new Konva.Rect({
                x: field.position.x,
                y: field.position.y,
                width: field.width,
                height: field.height,
                fill: field.fill || "#f0c000",
                listening: false
            }));
        } else if (field.shapeType === "line") {
            shapeLayer.add(new Konva.Line({
                points: field.points,
                stroke: field.stroke || "#000",
                strokeWidth: field.strokeWidth || 1,
                lineCap: "round",
                lineJoin: "round",
                listening: false
            }));
        }
    }

    /* --------------------------------
   IMAGES (FIXED)
-------------------------------- */

    for (const field of elements) {
        if (!field.show || !field.position) continue;
        if (!["logo", "profilePhoto"].includes(field.key)) continue;

        const entry = imageCache.get(field.key);
        if (!entry || !entry.img) continue;

        safeAddImage(imageLayer, {
            image: entry.img,   // ✅ REAL Image
            x: field.position.x,
            y: field.position.y,
            width: field.width,
            height: field.height,
            cornerRadius:
                field.key === "profilePhoto" ? field.width / 2 : 0
        });
    }

    /* --------------------------------
       QR CODE (PATCH)
    -------------------------------- */

    const qrField = elements.find(e => e.key === "qrCode" && e.show);

    if (qrField) {
        console.log("Rendering QR Code...");

        const qrGroup = await renderQRCode({
            x: qrField?.position?.x,
            y: qrField?.position?.y,
            size: 70,
            value: qrField.link || "Link Missing!"
        });

        qrGroup.listening(false);

        imageLayer.add(qrGroup);

        // 🔴 REQUIRED IN NODE
        imageLayer.draw();
    }

    /* --------------------------------
       TEXT
    -------------------------------- */

    for (const field of elements) {
        if (
            !field.show ||
            !field.position ||
            (!options[field.key] && !field.key.startsWith("customText-")) ||
            field.key.startsWith("social-")
        ) continue;

        const displayText = options[field.key]
            ? getGroupedText(elements, options, field.key)
            : field.value;

        if (!displayText) continue;

        const group = new Konva.Group({
            x: field.position.x,
            y: field.position.y
        });

        let iconNode = null;
        let iconSize = 0;

        if (field.label === "ICON") {
            iconSize = field.fontSize * 1.3;
            iconNode = renderIcon({
                key: field.key,
                x: 0,
                y: 0,
                size: iconSize,
                color: field.color || "#000"
            });
            if (iconNode) group.add(iconNode);
        }

        const textNode = new Konva.Text({
            x: iconNode ? iconSize + 1 : 0,
            y: 0,
            text: displayText,
            width: field.width * 1.1,
            fontSize: field.fontSize * 0.82,
            fontFamily: field.fontFamily || "Arial",
            fontStyle: resolveFontStyle(field),
            fill: field.color || "#000",
            align: resolveAlign(field),
            wrap: "word",
            lineHeight: 1.1
        });

        group.add(textNode);
        /* -------- ALIGNMENT OFFSET (KEY FIX) -------- */

        if (iconNode) {
            const boxWidth = textNode.width();
            const glyphWidth = textNode.getTextWidth();

            let alignOffset = 0;

            if (field.align === "center") {
                alignOffset = (boxWidth - glyphWidth) / 2;
            } else if (field.align === "right") {
                alignOffset = boxWidth - glyphWidth;
            }

            // 🔥 Icon sticks to visual text start
            iconNode.x(alignOffset);
            // textNode.x(alignOffset + iconSize);
        }

        /* -------- VERTICAL CENTER -------- */

        if (iconNode) {
            iconNode.y((textNode.height() - iconSize) / 2);
        }

        textLayer.add(group);
    }

    /* --------------------------------
       EXPORT
    -------------------------------- */

    stage.draw();

    return stage
        .toCanvas({ pixelRatio: 1 })
        .toBuffer("image/png");
}
