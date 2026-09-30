export type Point = {
    x: number;
    y: number;
    time: number;
};

export type Stroke = {
    id: number;
    width: number;
    points: Point[];
};