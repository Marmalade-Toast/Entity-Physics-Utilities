import { log } from "../../lib/debug/logging";
import { addIP, magnitude, mul } from "../vector3-utils/math";

export class ExplosionSimulator {
    static simulateEBEO(dimension, initialAttemptLocation, entityVelocity) {
        // Approximate recreation of EBEO mechanic.
        const speed = magnitude(entityVelocity);
        if (speed === 0) return {dimension: dimension, ...initialAttemptLocation};
        const step = mul(entityVelocity, -1/speed);
        let attemptLocation = {...initialAttemptLocation};
        for (let offsetCount = 0; offsetCount <= ExplosionSimulator.maxEBEOCount(speed); offsetCount++) {
            const block = dimension.getBlock(attemptLocation);
            if (!block.isSolid) return {dimension: dimension, ...attemptLocation};
            addIP(attemptLocation, step);
        }
        return {dimension: dimension, ...initialAttemptLocation};
    }

    static maxEBEOCount(speed) {
        return Math.min(5, Math.ceil(speed));
    }
}