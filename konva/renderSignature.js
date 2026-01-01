import Konva from "./setup.js";
import sharp from "sharp";
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

/* --------------------------------
   MAIN RENDERER
-------------------------------- */

export async function renderSignature({ elements }) {

    const BASE_WIDTH = 336;
    const SCALE = 3;

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
        ],
    };

    /* --------------------------------
       STAGE + LAYERS (FIXED ORDER)
    -------------------------------- */

    const stage = new Konva.Stage({
        width: stageWidth * SCALE,
        height: stageHeight * SCALE,
        scaleX: SCALE,
        scaleY: SCALE,
        listening: false
    });

    const backgroundLayer = new Konva.Layer({ listening: false }); // bottom
    const shapeLayer = new Konva.Layer({ listening: false });
    const imageLayer = new Konva.Layer({ listening: false });
    const textLayer = new Konva.Layer({ listening: false }); // top

    stage.add(backgroundLayer);
    stage.add(shapeLayer);
    stage.add(imageLayer);
    stage.add(textLayer);

    /* --------------------------------
       BACKGROUND (ONLY HERE)
    -------------------------------- */

    const bgColor = elements.find(e => e.key === "backgroundColor");
    const bgImage = elements.find(e => e.key === "backgroundImage" && e.show);
    if (bgImage?.link || bgImage?.value) {
        const img = await loadImage(bgImage.link || bgImage.value);
        if (img) {
            backgroundLayer.add(
                new Konva.Image({
                    image: img,
                    x: 0,
                    y: 0,
                    width: stageWidth,
                    height: stageHeight,
                    cornerRadius: 8,
                    listening: false
                })
            );
        }
    } else {
        backgroundLayer.add(
            new Konva.Rect({
                x: 0,
                y: 0,
                width: stageWidth,
                height: stageHeight,
                fill: bgColor?.value || "#ffffff",
                cornerRadius: 8,
                listening: false
            })
        );
    }

    /* --------------------------------
       SHAPES (ABOVE BACKGROUND)
    -------------------------------- */

    for (const field of elements) {
        if (!field.show || !field.shapeType) continue;

        if (field.shapeType === "circle" && field.position) {
            shapeLayer.add(
                new Konva.Circle({
                    x: field.position.x,
                    y: field.position.y,
                    radius: field.radius || 10,
                    fill: field.fill || "#ccc",
                    listening: false
                })
            );
        }

        if (field.shapeType === "rect" && field.position) {
            shapeLayer.add(
                new Konva.Rect({
                    x: field.position.x,
                    y: field.position.y,
                    width: field.width,
                    height: field.height,
                    fill: field.fill || "#f0c000",
                    listening: false
                })
            );
        }

        if (field.shapeType === "line" && Array.isArray(field.points)) {
            shapeLayer.add(
                new Konva.Line({
                    points: field.points,
                    stroke: field.stroke || "#000",
                    strokeWidth: field.strokeWidth || 1,
                    lineCap: "round",
                    lineJoin: "round",
                    listening: false
                })
            );
        }
    }

    /* --------------------------------
       IMAGES (MIDDLE)
    -------------------------------- */

    for (const field of elements) {
        if (!field.show || !field.position) continue;
        if (!["logo", "profilePhoto"].includes(field.key)) continue;

        const img = await loadImage(field.link || field.value);
        if (!img) continue;

        imageLayer.add(
            new Konva.Image({
                image: img,
                x: field.position.x,
                y: field.position.y,
                width: field.width,
                height: field.height,
                cornerRadius:
                    field.key === "profilePhoto" ? field.width / 2 : 0,
                listening: false
            })
        );
    }

    /* --------------------------------
       QR CODE
    -------------------------------- */

    // const qrField = elements.find(e => e.key === "qrCode" && e.show);
    // if (qrField?.position && (qrField.value || qrField.link)) {
    //     const qrGroup = await renderQRCode({
    //         x: qrField.position.x,
    //         y: qrField.position.y,
    //         size: Math.max(qrField.width, 96),
    //         value: qrField.link || qrField.value,
    //         fgColor: "#000",
    //         bgColor: "#fff"
    //     });

    //     imageLayer.add(qrGroup);
    // }
    const qrField = elements.find(e => e.key === "qrCode" && e.show);
    if (qrField) {
        const QR_SIZE = 80;
        const qrGroup = await renderQRCode({
            x: qrField?.position?.x,
            y: qrField?.position?.y,
            size: QR_SIZE,
            value: qrField.link || "Invalid Link !",
            fgColor: "#000",
            bgColor: "#fff"
        });

        imageLayer.add(qrGroup);
    }

    /* --------------------------------
       TEXT + ICONS (TOP)
    -------------------------------- */

    for (const field of elements) {
        if (
            !field.show ||
            !field.position ||
            (!options?.[field?.key] && !field?.key?.startsWith("customText-")) ||
            field.key?.startsWith("social-") ||
            [
                "profilePhoto",
                "logo",
                "qrCode",
                "banner",
                "backgroundColor",
                "backgroundImage",
                "signatureName",
                "disclaimer"
            ].includes(field.key)
        ) continue;

        const displayText = options[field.key]
            ? getGroupedText(elements, options, field.key)
            : field.value;
        if (!displayText) continue;

        const group = new Konva.Group({
            x: field.position.x,
            y: field.position.y,
            listening: false
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
            text: `${!!field.label && field.label !== "ICON" && !field?.key?.startsWith("customText-") ? field.label + " : " : ""} ${displayText}`,
            width: field.width * 1.08,
            fontSize: field.fontSize * 0.82,
            fontFamily: field.fontFamily || "Arial",
            fontStyle: resolveFontStyle(field),
            textDecoration: field.fontDecorationLine || "",
            fill: field.color || "#fff",
            align: resolveAlign(field),
            wrap: "word",
            lineHeight: 1.1,
            listening: false
        });

        group.add(textNode);

        if (iconNode) {
            iconNode.y((textNode.height() - iconSize) / 2);
        }

        textLayer.add(group);
    }

    /* --------------------------------
       EXPORT
    -------------------------------- */

    backgroundLayer.draw();
    shapeLayer.draw();
    imageLayer.draw();
    textLayer.draw();

    const canvas = stage.toCanvas({ pixelRatio: 1 });
    const buffer = canvas.toBuffer("image/png");

    return sharp(buffer, { premultipliedAlpha: false })
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toBuffer();
}
