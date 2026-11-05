export function getElseSetDefault(obj, key, defaultValue) {
    return obj[key] ?? (obj[key] = defaultValue);
}

export function getElseSetDefaultMap(obj, key, defaultValue) {
    const value = obj.get(key);
    if (value !== undefined) {
        return value
    }
    obj.set(key, defaultValue);
    return defaultValue;
}