import { getAuthInstance } from '@/lib/better-auth/init';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { NextResponse } from 'next/server';

async function getCurrentUserId() {
    const auth = await getAuthInstance();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return { userId: '', email: '' };
    }

    const email = session.user.email || '';
    let userId = session.user.id || '';

    if (email) {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (db) {
            const user = await db.collection('user').findOne<{ _id?: unknown; id?: string }>({ email });
            const resolvedId = (user?.id as string) || String(user?._id || '');
            if (resolvedId) userId = resolvedId;
        }
    }

    return { userId, email };
}

export async function GET() {
    try {
        const { userId } = await getCurrentUserId();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const items = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();

        return NextResponse.json({
            items: items.map((item) => ({
                symbol: item.symbol,
                company: item.company,
                addedAt: item.addedAt,
            })),
            count: items.length,
        });
    } catch (error) {
        console.error('[API] /watchlist GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await getCurrentUserId();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const symbol = String(body?.symbol || '').trim().toUpperCase();
        const company = String(body?.company || symbol).trim();

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        await connectToDatabase();

        await Watchlist.updateOne(
            { userId, symbol },
            {
                $set: { company },
                $setOnInsert: { addedAt: new Date() },
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true, symbol, company, isInWatchlist: true });
    } catch (error) {
        console.error('[API] /watchlist POST error:', error);
        return NextResponse.json({ error: 'Failed to add stock to watchlist' }, { status: 500 });
    }
}
