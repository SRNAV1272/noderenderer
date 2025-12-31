import Konva from "../setup.js";

/**
 * Mobile / Phone Device Icon
 * viewBox = 512
 */
export function renderMobileIcon({
    x,
    y,
    size,
    color = "#000"
}) {
    const scale = size / 512;

    const group = new Konva.Group({
        x,
        y,
        scaleX: scale,
        scaleY: scale,
        listening: false
    });

    /* =============================
       PHONE BODY
    ============================= */
    group.add(
        new Konva.Rect({
            x: 136,
            y: 40,
            width: 240,
            height: 432,
            cornerRadius: 36,
            stroke: color,
            strokeWidth: 22,
            fillEnabled: false,
            listening: false
        })
    );

    /* =============================
       SCREEN
    ============================= */
    group.add(
        new Konva.Rect({
            x: 160,
            y: 92,
            width: 192,
            height: 300,
            cornerRadius: 18,
            stroke: color,
            strokeWidth: 18,
            opacity: 0.9,
            fillEnabled: false,
            listening: false
        })
    );

    /* =============================
       SPEAKER
    ============================= */
    group.add(
        new Konva.Rect({
            x: 215,
            y: 62,
            width: 82,
            height: 16,
            cornerRadius: 8,
            fill: color,
            opacity: 0.7,
            listening: false
        })
    );

    /* =============================
       HOME BUTTON
    ============================= */
    group.add(
        new Konva.Rect({
            x: 214,
            y: 412,
            width: 84,
            height: 32,
            cornerRadius: 16,
            stroke: color,
            strokeWidth: 16,
            fillEnabled: false,
            listening: false
        })
    );

    return group;
}
