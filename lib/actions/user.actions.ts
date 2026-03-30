'use server';

import { connectToDatabase } from "@/database/mongoose";

export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Mongoose connection not connected');

        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null } },
            { projection: { _id: 1, id: 1, email: 1, name: 1, country: 1 } }
        ).toArray();

        return users.filter((user) => user.email && user.name).map((user) => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name
        }))
    } catch (e) {
        console.error('Error fetching users for news email:', e)
        return []
    }
}

export const getWatchlistSymbolsByEmail = async (email: string): Promise<string[]> => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Mongoose connection not connected');

        // First get the user ID by email
        const user = await db.collection('user').findOne(
            { email },
            { projection: { _id: 1, id: 1 } }
        );

        if (!user) return [];

        const userId = user.id || user._id?.toString() || '';
        if (!userId) return [];

        // Now get watchlist symbols for this user
        const watchlistItems = await db.collection('watchlist').find(
            { userId },
            { projection: { symbol: 1 } }
        ).toArray();

        return watchlistItems
            .map((item: any) => item.symbol)
            .filter((symbol): symbol is string => Boolean(symbol));
    } catch (e) {
        console.error('Error fetching watchlist symbols for email:', email, e);
        return [];
    }
}