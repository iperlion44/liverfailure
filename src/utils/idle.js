// così le cose non urgenti (tipo il prefetch) non rallentano il primo
// render. ritorna una funzione per annullare se serve
export function onIdle(callback, timeout = 2000) {
    if (typeof window === "undefined") {
        return () => {};
    }

    if (typeof window.requestIdleCallback === "function") {
        const handle = window.requestIdleCallback(callback, { timeout });

        return () => window.cancelIdleCallback(handle);
    }

    const handle = window.setTimeout(callback, 200);

    return () => window.clearTimeout(handle);
}
