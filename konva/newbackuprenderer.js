import Konva from "./setup.js";
import { renderIcon } from "./icons/index.js";
import { loadImage } from "./loadImage.js";
import { renderQRCode } from "./qr/renderQrCode.js";

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
   MAIN RENDERER (FAST)
-------------------------------- */

export async function renderSignature({ elements }) {

    /* --------------------------------
       CONFIG
    -------------------------------- */

    const BASE_WIDTH = 336;
    const EXPORT_SCALE = 1.5; // 🔥 controls output quality

    const signatureMeta = elements.find(el => el.key === "signatureName");
    const ratio =
        signatureMeta?.width && signatureMeta?.height
            ? signatureMeta.width / signatureMeta.height
            : 7 / 4;

    const stageWidth = BASE_WIDTH;
    const stageHeight = Math.round(BASE_WIDTH / ratio);

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
       PARALLEL IMAGE LOADING (HUGE WIN)
    -------------------------------- */

    const imageCache = new Map();

    await Promise.all(
        elements.map(async field => {
            if (!field.show) return;

            const src =
                field.key === "backgroundImage"
                    ? field.link || field.value
                    : ["logo", "profilePhoto"].includes(field.key)
                        ? field.link || field.value
                        : null;

            if (!src) return;

            try {
                const img = await loadImage(src);
                if (img) imageCache.set(field.key, img);
            } catch { }
        })
    );

    /* --------------------------------
       STAGE + LAYERS (NO SCALING)
    -------------------------------- */

    const stage = new Konva.Stage({
        width: stageWidth,
        height: stageHeight,
        listening: false
    });

    const backgroundLayer = new Konva.Layer({ listening: false });
    const shapeLayer = new Konva.Layer({ listening: false });
    const imageLayer = new Konva.Layer({ listening: false });
    const textLayer = new Konva.Layer({ listening: false });

    stage.add(backgroundLayer, shapeLayer, imageLayer, textLayer);

    /* --------------------------------
       BACKGROUND
    -------------------------------- */

    const bgColor = elements.find(e => e.key === "backgroundColor");
    const bgImg = imageCache.get("backgroundImage");

    if (bgImg) {
        safeAddImage(backgroundLayer, {
            image: bgImg,
            x: 0,
            y: 0,
            width: stageWidth,
            height: stageHeight,
            cornerRadius: 8
        });
    } else {
        backgroundLayer.add(
            new Konva.Rect({
                x: 0,
                y: 0,
                width: stageWidth,
                height: stageHeight,
                fill: bgColor?.value || "#ffffff",
                cornerRadius: 8
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
       IMAGES
    -------------------------------- */

    for (const field of elements) {
        if (!field.show || !field.position) continue;
        if (!["logo", "profilePhoto"].includes(field.key)) continue;

        const img = imageCache.get(field.key);
        if (!img) continue;

        safeAddImage(imageLayer, {
            image: img,
            x: field.position.x,
            y: field.position.y,
            width: field.width,
            height: field.height,
            cornerRadius:
                field.key === "profilePhoto" ? field.width / 2 : 0
        });
    }

    /* --------------------------------
       QR CODE
    -------------------------------- */

    const qrField = elements.find(e => e.key === "qrCode" && e.show);
    if (qrField) {
        const qrGroup = await renderQRCode({
            x: qrField.position.x,
            y: qrField.position.y,
            size: 80,
            value: qrField.link || "Link Missing!",
            fgColor: "#000",
            bgColor: "#fff"
        });
        imageLayer.add(qrGroup);
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

        if (iconNode) {
            iconNode.y((textNode.height() - iconSize) / 2);
        }

        textLayer.add(group);
    }

    /* --------------------------------
       EXPORT (FAST & STABLE)
    -------------------------------- */

    stage.draw();

    return stage
        .toCanvas({ pixelRatio: EXPORT_SCALE })
        .toBuffer("image/png");
}
