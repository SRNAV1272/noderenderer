import Konva from "../setup.js";

/**
 * Landline Phone Icon
 * viewBox = 24
 */
export function renderPhoneIcon({
    x,
    y,
    size,
    color = "#000"
}) {
    const scale = size / 24; // IMPORTANT (viewBox = 24)

    const group = new Konva.Group({
        x,
        y,
        scaleX: scale,
        scaleY: scale,
        listening: false
    });

    group.add(
        new Konva.Path({
            data: `
        M21 16.5V20
        C21 20.55 20.55 21 20 21
        C9.95 21 3 14.05 3 4
        C3 3.45 3.45 3 4 3
        H7.5
        C8.05 3 8.5 3.45 8.5 4
        C8.5 5.1 8.67 6.15 9 7.15
        C9.13 7.56 9.03 8.01 8.73 8.31
        L7 10.05
        C8.35 12.85 11.15 15.65 13.95 17
        L15.69 15.27
        C15.99 14.97 16.44 14.87 16.85 15
        C17.85 15.33 18.9 15.5 20 15.5
        C20.55 15.5 21 15.95 21 16.5Z
      `,
            stroke: color,
            strokeWidth: 1.5,
            lineJoin: "round",
            lineCap: "round",
            fillEnabled: false,
            listening: false
        })
    );

    return group;
}
