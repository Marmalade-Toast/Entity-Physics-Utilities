export class ExplosionSimulator {
    static simulateEBEO(dimension, initialAttemptLocation, entityVelocity) {
        // Approximate recreation of EBEO mechanic.
        const speed = Math.hypot(entityVelocity.x, entityVelocity.y, entityVelocity.z);
        if (speed === 0) return {dimension: dimension, ...initialAttemptLocation};
        const reciprocalSpeed = 1 / speed;
        const step = {
            x: - entityVelocity.x*reciprocalSpeed,
            y: - entityVelocity.y*reciprocalSpeed,
            z: - entityVelocity.z*reciprocalSpeed
        }
        let attemptLocation = {...initialAttemptLocation};
        for (let offsetCount = 0; offsetCount <= ExplosionSimulator.maxEBEOCount(speed); offsetCount++) {
            const block = dimension.getBlock(attemptLocation);
            if (!block.isSolid) return {dimension: dimension, ...attemptLocation};
            attemptLocation.x += step.x;
            attemptLocation.y += step.y;
            attemptLocation.z += step.z;
        }
        return {dimension: dimension, ...initialAttemptLocation};
    }

    static maxEBEOCount(speed) {
        return Math.min(5, Math.ceil(speed));
    }
}