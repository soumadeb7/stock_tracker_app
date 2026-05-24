import { NextResponse } from 'next/server';

import { getTradingPortfolio } from '@/lib/trading/service';
import { getTradingUserContext } from '@/lib/trading/session';

export async function GET() {
    try {
        const user = await getTradingUserContext();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const portfolio = await getTradingPortfolio(user.userId, user.userEmail);

        return NextResponse.json({ success: true, data: portfolio });
    } catch (error) {
        console.error('[API] /trading/portfolio GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load simulated portfolio' }, { status: 500 });
    }
}