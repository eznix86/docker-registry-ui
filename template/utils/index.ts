export const random = (min: number, max: number) => (
    Math.floor(Math.random() * (max - min)) + min
);

export const range = (start: number, end: number = start, step = 1) => {
    let output = [];

    if (start === end) {
        start = 0;
    }

    for (let i = start; i < end; i += step) {
        output.push(i);
    }

    return output;
};