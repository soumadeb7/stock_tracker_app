import { NextResponse } from 'next/server';

import { getTradingUserContext } from '@/lib/trading/session';
import { TradingError, executeTradingOrder } from '@/lib/trading/service';

export async function POST(request: Request) {
    try {
        const user = await getTradingUserContext();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const symbol = String((body as Record<string, unknown>)?.symbol || '').trim().toUpperCase();
        const assetName = String((body as Record<string, unknown>)?.assetName || symbol).trim();
        const side = ((body as Record<string, unknown>)?.side === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell';
        const quantity = Math.max(0, Math.floor(Number((body as Record<string, unknown>)?.quantity) || 0));

        if (!symbol) {
            return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
        }

        if (!quantity) {
            return NextResponse.json({ success: false, error: 'Quantity must be greater than zero' }, { status: 400 });
        }

        const result = await executeTradingOrder(user.userId, user.userEmail, {
            symbol,
            assetName,
            side,
            quantity,
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        const message = error instanceof TradingError ? error.message : 'Failed to execute simulated trade';
        const status = error instanceof TradingError ? error.statusCode : 500;

        console.error('[API] /trading/orders POST error:', error);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}