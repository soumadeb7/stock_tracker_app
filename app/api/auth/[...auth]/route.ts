import { toNextJsHandler } from "better-auth/next-js";
import { getAuthInstance, initializeAuth } from "@/lib/better-auth/init";

// Pre-initialize auth at module load time
await initializeAuth();

export async function GET(request: Request, context: any) {
    const auth = await getAuthInstance();
    const { GET } = toNextJsHandler(auth);
    return GET(request, context);
}

export async function POST(request: Request, context: any) {
    const auth = await getAuthInstance();
    const { POST } = toNextJsHandler(auth);
    return POST(request, context);
}
