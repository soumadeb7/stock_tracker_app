import { getAuthInstance } from '@/lib/better-auth/init';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // Get current user session
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { country, investmentGoals, riskTolerance, preferredIndustry } = await request.json();

        // Connect to database and update user
        await connectToDatabase();
        const db = (await connectToDatabase()).connection.db;

        if (!db) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        const result = await db.collection('user').updateOne(
            { id: userId },
            {
                $set: {
                    country,
                    investmentGoals,
                    riskTolerance,
                    preferredIndustry,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Profile updated' });
    } catch (error) {
        console.error('[API] /auth/update-profile error:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
