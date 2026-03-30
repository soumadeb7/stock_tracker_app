import { getAuth } from "@/lib/better-auth/auth";

let authInstance: any = null;
let initPromise: Promise<any> | null = null;

export async function initializeAuth() {
    if (authInstance) return authInstance;

    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            authInstance = await getAuth();
            return authInstance;
        } catch (e) {
            console.error('[Auth Init] Failed to initialize auth:', e);
            throw e;
        }
    })();

    return initPromise;
}

export async function getAuthInstance() {
    if (!authInstance) {
        await initializeAuth();
    }
    return authInstance;
}
