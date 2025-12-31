import Konva from "../setup.js";

export function renderEmailIcon({
    x,
    y,
    size,
    color
}) {
    const scale = size / 512; // VERY IMPORTANT (viewBox 512)

    const group = new Konva.Group({
        x,
        y,
        scaleX: scale,
        scaleY: scale,
        listening: false
    });

    /* Envelope outline */
    group.add(
        new Konva.Rect({
            x: 56,
            y: 120,
            width: 400,
            height: 272,
            cornerRadius: 36,
            stroke: color,
            strokeWidth: 24,
            listening: false
        })
    );

    /* Top flap */
    group.add(
        new Konva.Line({
            points: [80, 140, 256, 290, 432, 140],
            stroke: color,
            strokeWidth: 22,
            lineCap: "round",
            lineJoin: "round",
            listening: false
        })
    );

    /* Bottom left */
    group.add(
        new Konva.Line({
            points: [80, 380, 210, 260],
            stroke: color,
            strokeWidth: 22,
            lineCap: "round",
            listening: false
        })
    );

    /* Bottom right */
    group.add(
        new Konva.Line({
            points: [430, 380, 300, 260],
            stroke: color,
            strokeWidth: 22,
            lineCap: "round",
            listening: false
        })
    );

    return group;
}
