import { log } from "./debug/logging";

export function joinOnKeyEqualOneToN(left, right, keyLeft, keyRight) {
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
        if (key === null || key === undefined || !(key in rightKV)) return;
        output.set(v, rightKV[key]);
    });
    return output;
}

export function joinOnKeyEqualOneToOne(left, right, keyLeft, keyRight) {
    // Stable with respect to left inputs
    
    const rightKV = {};
    right.forEach(v => {
        const key = keyRight(v);
        if (key === null || key === undefined) return;
        (rightKV[key] ?? (rightKV[key] = [])).push(v);
    });
    Object.values(rightKV).forEach(a => a.reverse());
    const output = [];
    left.forEach(v => {
        const key = keyLeft(v);
        if (key === null || key === undefined || !(key in rightKV)) return;
        const rightVQueue = rightKV[key];
        output.push([v, rightKV[key].pop()]);
        if (!rightVQueue.length) {
            delete rightKV[key];
        }
    });
    return output;
}