export type RectLike = {
    left: number;
    top: number;
};

export function screenToCanvas(
    clientX: number,
    clientY: number,
    rect: RectLike
) {
    return {
        x: clientX - rect.left,
        y: clientY - rect.top,
    };
}