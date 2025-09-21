export function deepEqual(a: any, b: any): boolean {
    return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(obj: any): any {
    if (obj === undefined || obj === null) return undefined;
    if (Array.isArray(obj)) return obj.map(normalize);
    if (typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, normalize(v)])
        );
    }
    return obj;
}
