import Konva from "./setup.js";
import sharp from "sharp";
import { renderIcon } from "./icons/index.js";
import { loadImage } from "./loadImage.js";
import { renderQRCode } from "./qr/renderQrCode.js";
// import QRCode from "qrcode";

/* --------------------------------
   Helpers (React parity)
-------------------------------- */

function resolveAlign(field) {
    if (field.align === "start") return "left";
    return field.align || "left";
}

function resolveFontStyle(field) {
    console.log(`${field.fontWeight} ${field.fontStyle}`)
    return `${900} ${field.fontStyle}`.trim() || "normal";
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
        .join(`${parent.separator || ", "} `);
}

/* --------------------------------
   QR Renderer (styled)
-------------------------------- */

// async function renderQRCode({
//     x,
//     y,
//     size,
//     value,
//     logoUrl,
//     fgColor = "#000",
//     bgColor = "#fff"
// }) {
//     const qr = QRCode.create(value, {
//         errorCorrectionLevel: "H"
//     });

//     const cells = qr.modules.data;
//     const count = qr.modules.size;
//     const cellSize = size / count;

//     const group = new Konva.Group({ x, y, listening: false });

//     // background
//     group.add(
//         new Konva.Rect({
//             x: 0,
//             y: 0,
//             width: size,
//             height: size,
//             fill: bgColor,
//             listening: false
//         })
//     );

//     // dots
//     for (let r = 0; r < count; r++) {
//         for (let c = 0; c < count; c++) {
//             const idx = r * count + c;
//             if (!cells[idx]) continue;

//             const isEye =
//                 (r < 7 && c < 7) ||
//                 (r < 7 && c > count - 8) ||
//                 (r > count - 8 && c < 7);

//             if (isEye) continue;

//             group.add(
//                 new Konva.Circle({
//                     x: c * cellSize + cellSize / 2,
//                     y: r * cellSize + cellSize / 2,
//                     radius: cellSize * 0.22,
//                     fill: fgColor,
//                     listening: false
//                 })
//             );
//         }
//     }

//     // eyes
//     function drawEye(ex, ey) {
//         group.add(
//             new Konva.Rect({
//                 x: ex,
//                 y: ey,
//                 width: cellSize * 7,
//                 height: cellSize * 7,
//                 cornerRadius: 6,
//                 fill: fgColor,
//                 listening: false
//             })
//         );

//         group.add(
//             new Konva.Rect({
//                 x: ex + cellSize,
//                 y: ey + cellSize,
//                 width: cellSize * 5,
//                 height: cellSize * 5,
//                 cornerRadius: 6,
//                 fill: bgColor,
//                 listening: false
//             })
//         );

//         group.add(
//             new Konva.Rect({
//                 x: ex + cellSize * 2,
//                 y: ey + cellSize * 2,
//                 width: cellSize * 3,
//                 height: cellSize * 3,
//                 cornerRadius: 6,
//                 fill: fgColor,
//                 listening: false
//             })
//         );
//     }

//     drawEye(0, 0);
//     drawEye((count - 7) * cellSize, 0);
//     drawEye(0, (count - 7) * cellSize);

//     // center logo
//     if (logoUrl) {
//         const logo = await loadImage(logoUrl);
//         if (logo) {
//             const logoSize = size * 0.28;
//             const pad = logoSize * 0.15;

//             group.add(
//                 new Konva.Rect({
//                     x: (size - logoSize) / 2 - pad,
//                     y: (size - logoSize) / 2 - pad,
//                     width: logoSize + pad * 2,
//                     height: logoSize + pad * 2,
//                     fill: bgColor,
//                     cornerRadius: 8,
//                     listening: false
//                 })
//             );

//             group.add(
//                 new Konva.Image({
//                     image: logo,
//                     x: (size - logoSize) / 2,
//                     y: (size - logoSize) / 2,
//                     width: logoSize,
//                     height: logoSize,
//                     listening: false
//                 })
//             );
//         }
//     }

//     return group;
// }

/* --------------------------------
   Main Renderer
-------------------------------- */

export async function renderSignature({
    elements,
    // options,
    // stageWidth = 336,
    // stageHeight = 192
}) {
    const BASE_WIDTH = 336;

    const signatureMeta = elements?.find(
        (el) => el.key === "signatureName"
    );

    const ratioValue =
        signatureMeta?.width && signatureMeta?.height
            ? signatureMeta.width / signatureMeta.height
            : 7 / 4; // fallback

    const baseWidth = BASE_WIDTH;
    const baseHeight = Math.round(BASE_WIDTH / ratioValue);

    const stageWidth = baseWidth
    const stageHeight = baseHeight
    const SCALE = 3; // 🔥 2 = good, 3 = very sharp
    const options = {
        fullName: ["prefix", "firstName", "lastName"],
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
            "pincode",
        ],
    };

    const stage = new Konva.Stage({
        width: stageWidth * SCALE,
        height: stageHeight * SCALE,
        scaleX: SCALE,
        scaleY: SCALE,
        listening: false
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    /* ---------- BACKGROUND ---------- */
    const bgColor = elements.find(e => e.key === "backgroundColor");
    const bgImage = elements.find(e => e.key === "backgroundImage" && e.show);

    if (bgImage && (bgImage.link || bgImage.value)) {
        const img = await loadImage(bgImage.link || bgImage.value);

        if (img) {
            layer.add(
                new Konva.Image({
                    image: img,
                    x: 0,
                    y: 0,
                    width: stageWidth,
                    height: stageHeight,
                    listening: false,
                    cornerRadius: 8
                })
            );
        }
    } else {
        layer.add(
            new Konva.Rect({
                x: 0,
                y: 0,
                width: stageWidth,
                height: stageHeight,
                fill: bgColor?.value || "#fff",
                cornerRadius: 8,
                listening: false
            })
        );
    }

    /* ---------- LOGO + PROFILE ---------- */
    for (const field of elements) {
        if (!field.show || !field.position) continue;
        if (!["logo", "profilePhoto"].includes(field.key)) continue;

        const img = await loadImage(field.link || field.value);
        if (!img) continue;

        layer.add(
            new Konva.Image({
                image: img,
                x: field.position.x,
                y: field.position.y,
                width: field.width,
                height: field.height,
                cornerRadius: field.key === "profilePhoto" ? field.width / 2 : 0,
                listening: false
            })
        );
    }

    /* ---------- QR CODE ---------- */
    const qrField = elements.find(e => e.key === "qrCode" && e.show);
    if (qrField?.position && (qrField.value || qrField.link)) {
        const qrSize = Math.max(qrField.width, 96); // 👈 CRITICAL
        const qrGroup = await renderQRCode({
            x: qrField.position.x,
            y: qrField.position.y,
            size: qrField.width,
            value: qrField.link || qrField.value,
            fgColor: "#000",
            bgColor: "#fff"
        });

        layer.add(qrGroup);

    }

    /* ---------- SHAPES ---------- */
    for (const field of elements) {
        if (!field.show || field.type !== "shape") continue;

        const { shapeType, position } = field;
        if (!position) continue;

        if (shapeType === "circle") {
            layer.add(
                new Konva.Circle({
                    x: position.x,
                    y: position.y,
                    radius: field.radius || 10,
                    fill: field.fill || "transparent",
                    // stroke: field.stroke || "",
                    // strokeWidth: field.strokeWidth || 0,
                    listening: false
                })
            );
        }

        if (shapeType === "rect") {
            layer.add(
                new Konva.Rect({
                    x: position.x,
                    y: position.y,
                    width: field.width,
                    height: field.height,
                    fill: field.fill || "transparent",
                    // stroke: field.stroke || "",
                    // strokeWidth: field.strokeWidth || 0,
                    // cornerRadius: field.radius || 0,
                    listening: false
                })
            );
        }

        if (shapeType === "line" && Array.isArray(field.points)) {
            layer.add(
                new Konva.Line({
                    // x: position.x,
                    // y: position.y,
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

    /* ---------- TEXT + ICONS ---------- */
    for (const field of elements) {
        if (!field.show || !field.position || field?.key?.startsWith("social-")) continue;

        if (
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

        // const displayText = options
        //     ? getGroupedText(elements, options, field.key)
        //     : field.value;

        let displayText = "";

        // ✅ If key exists in options mapping → grouped text
        if (options && options[field.key]) {
            displayText = getGroupedText(elements, options, field.key);
        }
        // ✅ Otherwise → direct value
        else {
            displayText = field.value;
        }
        if (!displayText) continue;

        const group = new Konva.Group({
            x: field.position.x,
            y: field.position.y,
            listening: false
        });

        let iconSize = 0;
        let iconNode = null;

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
        console.log(displayText)
        const textNode = new Konva.Text({
            x: iconNode ? iconSize + 4 : 0,
            y: 0,
            text: displayText,
            width: field.width * 1.12,
            fontSize: field.fontSize,
            // fontWeight: field?.fontWeight,
            fontFamily: field.fontFamily || "Arial",
            fontStyle: resolveFontStyle(field),
            textDecoration: field.fontDecorationLine || "",
            fill: field.color || "#000",
            align: resolveAlign(field),
            wrap: "word",
            lineHeight: 1.1,
            listening: false
        });

        group.add(textNode);

        if (iconNode) {
            iconNode.y((textNode.height() - iconSize) / 2);
        }

        layer.add(group);
    }

    /* ---------- EXPORT ---------- */
    layer.draw();
    const canvas = stage.toCanvas({ pixelRatio: 1 });
    const buffer = canvas.toBuffer("image/png");

    // return sharp(buffer).png({ compressionLevel: 9 }).toBuffer();
    // return sharp(buffer)
    //     .png({
    //         compressionLevel: 9,
    //         adaptiveFiltering: false
    //     })
    //     .resize(stageWidth, stageHeight, {
    //         kernel: sharp.kernel.nearest   // 🔥 CRITICAL
    //     })
    //     .toBuffer();
    return sharp(buffer, { premultipliedAlpha: false })
        .png({
            compressionLevel: 9,
            adaptiveFiltering: false
        })
        .toBuffer();
}
