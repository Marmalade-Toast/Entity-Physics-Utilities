import { log } from "./debug/logging";

export function innerJoinOnKeyEqual(left, right, keyLeft, keyRight) {
    // Associate each value of left with one or multiple values from right,
    // excluding the left value if no corresponding right values are found.
    // Nullish keys will not be joined.

    const rightKV = {};
    right.forEach(v => {
        const key = keyRight(v);
        if (key === null || key === undefined) return;
        (rightKV[key] ?? (rightKV[key] = [])).push(v);
    });
    const output = new Map();
    left.forEach(v => {
        const key = keyLeft(v);
        if (key === null || key === undefined) return;
        if (key in rightKV) {
            output.set(v, rightKV[key]);
        }
    });
    return output;
}