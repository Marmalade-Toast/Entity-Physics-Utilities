const Zero = Object.freeze({x: 0, y: 0, z: 0});

export function add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
}

export function addIP(a, b) {
    a.x += b.x;
    a.y += b.y;
    a.z += b.z;
    return a;
}

export function sub(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    };
}

export function subIP(a, b) {
    a.x -= b.x;
    a.y -= b.y;
    a.z -= b.z;
    return a;
}

export function mul(a, s) {
    return {
        x: a.x * s,
        y: a.y * s,
        z: a.z * s
    };
}

export function mulIP(a, s) {
    a.x *= s;
    a.y *= s;
    a.z *= s;
    return a;
}

export function mulEl(a, b) {
    return {
        x: a.x * b.x,
        y: a.y * b.y,
        z: a.z * b.z
    };
}

export function mulElIP(a, b) {
    a.x *= b.x;
    a.y *= b.y;
    a.z *= b.z;
    return a;
}

export function dot(a, b) {
    return a.x*b.x + a.y*b.y + a.z*b.z;
}

export function cross(a, b) {
    return {
        x: a.y*b.z - a.x*b.y,
        y: a.z*b.x - a.x*b.z,
        z: a.x*b.y - a.y*b.x
    };
}

export function crossIP(a, b) {
    const newX = a.y*b.z - a.x*b.y;
    const newY = a.z*b.x - a.x*b.z;
    const newZ = a.x*b.y - a.y*b.x;
    a.x = newX;
    a.y = newY;
    a.z = newZ;
    return a;
}

export function magnitudeSquared(a) {
    return dot(a, a);
}

export function magnitude(a) {
    return Math.sqrt(dot(a, a));
}

export function normalise(a) {
    const magnitude_ = magnitude(a);
    if (!magnitude) return {...Zero};
    return mul(a, 1/magnitude_);
}

export function normaliseIP(a) {
    const magnitude_ = magnitude(a);
    if (!magnitude) {
        a.x = 0;
        a.y = 0;
        a.z = 0;
        return a;
    };
    return mulIP(a, 1/magnitude_);
}