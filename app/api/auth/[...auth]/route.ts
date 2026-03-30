import { toNextJsHandler } from "better-auth/next-js";
import { getAuthInstance } from "@/lib/better-auth/init";

export async function GET(request: Request, context: any) {
    try {
        const auth = await getAuthInstance();
        const { GET } = toNextJsHandler(auth);
        return GET(request, context);
    } catch (error) {
        console.error('[Auth GET] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST(request: Request, context: any) {
    try {
        const auth = await getAuthInstance();
        const { POST } = toNextJsHandler(auth);
        return POST(request, context);
    } catch (error) {
        console.error('[Auth POST] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
