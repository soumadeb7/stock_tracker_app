import { NextResponse } from 'next/server';

import { getTradingUserContext } from '@/lib/trading/session';
import { listTradingTransactions } from '@/lib/trading/service';

export async function GET(request: Request) {
    try {
        const user = await getTradingUserContext();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const search = url.searchParams.get('search') || '';
        const type = url.searchParams.get('type') || 'all';
        const sortBy = url.searchParams.get('sortBy') === 'side' ? 'side' : 'executedAt';
        const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
        const page = Math.max(1, Math.floor(Number(url.searchParams.get('page') || 1)));
        const limit = Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 8)));

        const data = await listTradingTransactions(user.userId, user.userEmail, {
            search,
            type: type === 'buy' || type === 'sell' ? type : 'all',
            sortBy,
            sortOrder,
            page,
            limit,
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[API] /trading/transactions GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load simulated transaction history' }, { status: 500 });
    }
}