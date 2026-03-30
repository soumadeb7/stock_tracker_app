import { getAuthInstance } from '@/lib/better-auth/init';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Verify user is authenticated
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userEmail = session.user.email;

        // Connect to database
        await connectToDatabase();
        const db = (await connectToDatabase()).connection.db;

        if (!db) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        // Fetch news inbox items sorted by date descending (most recent first)
        const items = await db
            .collection('newsinboxes')
            .find({ userEmail })
            .sort({ date: -1 })
            .limit(30)
            .toArray();

        // Convert MongoDB ObjectId to string
        const formattedItems = items.map(item => ({
            ...item,
            _id: item._id.toString(),
        }));

        return NextResponse.json({
            items: formattedItems,
            count: formattedItems.length,
        });
    } catch (error) {
        console.error('[API] /inbox error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inbox' },
            { status: 500 }
        );
    }
}
