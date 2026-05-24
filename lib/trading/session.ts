import { headers } from 'next/headers';

import { connectToDatabase } from '@/database/mongoose';
import { getAuthInstance } from '@/lib/better-auth/init';

export type TradingUserContext = {
    userId: string;
    userEmail: string;
};

export async function getTradingUserContext(): Promise<TradingUserContext | null> {
    try {
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session?.user) {
            return null;
        }

        const userEmail = session.user.email || '';
        let userId = session.user.id || userEmail;

        if (userEmail) {
            try {
                const mongoose = await connectToDatabase();
                const db = mongoose.connection.db;

                if (db) {
                    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string }>({ email: userEmail });
                    const resolvedId = (user?.id as string) || String(user?._id || '');

                    if (resolvedId) {
                        userId = resolvedId;
                    }
                }
            } catch (error) {
                console.warn('[Trading] Falling back to session id for user resolution:', error);
            }
        }

        if (!userId) {
            return null;
        }

        return { userId, userEmail };
    } catch (error) {
        console.error('[Trading] Failed to resolve user context:', error);
        return null;
    }
}