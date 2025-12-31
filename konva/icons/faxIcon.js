import Konva from "../setup.js";

/**
 * Fax Icon
 * viewBox = 512
 */
export function renderFaxIcon({
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
       MAIN BODY
    ============================= */
    group.add(
        new Konva.Path({
            data: `
        M429.684 163.714V78.711L350.958 0h-4.916h-179.11v148.673
        c-12.768-10.612-29.068-17.136-46.961-17.136h-16.586
        c-20.396-0.015-38.776 8.324-51.953 21.734
        C38.239 166.674 30.162 185.2 30.17 205.55v221.216
        c0.008 47.015 38.219 85.218 85.235 85.234h281.192
        c47.015-0.016 85.219-38.219 85.234-85.234V242.262
        c-0.015-35.29-21.533-65.611-52.147-78.548z
      `,
            fill: color,
            listening: false
        })
    );

    /* =============================
       BUTTON DOTS
    ============================= */
    const dots = [
        [236.98, 386.908], [316.131, 386.908], [395.283, 386.908],
        [236.98, 336.771], [316.131, 336.771], [395.283, 336.771],
        [236.98, 286.649], [316.131, 286.649], [395.283, 286.649]
    ];

    dots.forEach(([x, y]) => {
        group.add(
            new Konva.Circle({
                x,
                y,
                radius: 15.38,
                fill: color,
                listening: false
            })
        );
    });

    /* =============================
       HORIZONTAL BAR
    ============================= */
    group.add(
        new Konva.Rect({
            x: 237.768,
            y: 231.696,
            width: 158.288,
            height: 31.658,
            cornerRadius: 15.829,
            fill: color,
            listening: false
        })
    );

    return group;
}
