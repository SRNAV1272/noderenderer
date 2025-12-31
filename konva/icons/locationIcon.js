import Konva from "../setup.js";

/**
 * Location / Pin Icon
 * viewBox = 512
 */
export function renderLocationIcon({
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
       OUTER PIN SHAPE
    ============================= */
    group.add(
        new Konva.Path({
            data: `
        M256 40
        C166 40 96 110 96 200
        C96 310 256 472 256 472
        C256 472 416 310 416 200
        C416 110 346 40 256 40 Z
      `,
            stroke: color,
            strokeWidth: 26,
            lineJoin: "round",
            fillEnabled: false,
            listening: false
        })
    );

    /* =============================
       INNER CIRCLE
    ============================= */
    group.add(
        new Konva.Circle({
            x: 256,
            y: 200,
            radius: 70,
            stroke: color,
            strokeWidth: 26,
            fillEnabled: false,
            listening: false
        })
    );

    return group;
}
