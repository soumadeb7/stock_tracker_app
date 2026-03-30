import { getAuthInstance } from '@/lib/better-auth/init';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { NextResponse } from 'next/server';

async function getCurrentUserId() {
    const auth = await getAuthInstance();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return '';
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

    return userId;
}

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { symbol } = await params;
        const cleanSymbol = String(symbol || '').trim().toUpperCase();

        if (!cleanSymbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        await connectToDatabase();
        const exists = await Watchlist.exists({ userId, symbol: cleanSymbol });

        return NextResponse.json({ isInWatchlist: Boolean(exists) });
    } catch (error) {
        console.error('[API] /watchlist/[symbol] GET error:', error);
        return NextResponse.json({ error: 'Failed to check watchlist status' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { symbol } = await params;
        const cleanSymbol = String(symbol || '').trim().toUpperCase();

        if (!cleanSymbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        await connectToDatabase();
        await Watchlist.deleteOne({ userId, symbol: cleanSymbol });

        return NextResponse.json({ success: true, symbol: cleanSymbol, isInWatchlist: false });
    } catch (error) {
        console.error('[API] /watchlist/[symbol] DELETE error:', error);
        return NextResponse.json({ error: 'Failed to remove stock from watchlist' }, { status: 500 });
    }
}
