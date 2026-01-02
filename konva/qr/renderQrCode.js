import Konva from "../setup.js";
import QRCode from "qrcode";

export async function renderQRCode({
    x,
    y,
    size,
    value,
    fgColor = "#000",
    bgColor = "#fff"
}) {
    const qr = QRCode.create(value, {
        errorCorrectionLevel: "H"
    });
    const count = qr.modules.size;
    const data = qr.modules.data;

    const QUIET = 4;
    const total = count + QUIET * 2;

    // 🔥 cell size computed ONLY from design size
    const cell = Math.floor(size / total);
    const qrSize = cell * total;

    const group = new Konva.Group({
        x,
        y,
        listening: false
    });

    /* ✅ REQUIRED QUIET ZONE */
    group.add(
        new Konva.Rect({
            x: 0,
            y: 0,
            width: qrSize,
            height: qrSize,
            fill: bgColor,
            listening: false
        })
    );

    /* ---------- DOTS ---------- */
    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (!data[r * count + c]) continue;

            const inEye =
                (r < 7 && c < 7) ||
                (r < 7 && c >= count - 7) ||
                (r >= count - 7 && c < 7);

            if (inEye) continue;

            group.add(
                new Konva.Circle({
                    x: (c + QUIET) * cell + cell / 2,
                    y: (r + QUIET) * cell + cell / 2,
                    radius: cell * 0.42,
                    fill: fgColor,
                    listening: false
                })
            );
        }
    }

    /* ---------- FINDER EYES ---------- */
    function eye(cx, cy) {
        const px = (cx + QUIET) * cell;
        const py = (cy + QUIET) * cell;

        group.add(new Konva.Rect({
            x: px,
            y: py,
            width: cell * 7,
            height: cell * 7,
            cornerRadius: cell * 1.4,
            fill: fgColor
        }));

        group.add(new Konva.Rect({
            x: px + cell,
            y: py + cell,
            width: cell * 5,
            height: cell * 5,
            cornerRadius: cell * 1.2,
            fill: bgColor
        }));

        group.add(new Konva.Rect({
            x: px + cell * 2,
            y: py + cell * 2,
            width: cell * 3,
            height: cell * 3,
            cornerRadius: cell,
            fill: fgColor
        }));
    }

    eye(0, 0);
    eye(count - 7, 0);
    eye(0, count - 7);

    return group;
}
