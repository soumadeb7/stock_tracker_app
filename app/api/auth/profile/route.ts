import { getAuthInstance } from '@/lib/better-auth/init';
import { connectToDatabase } from '@/database/mongoose';
import { User } from '@/database/models/user.model';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        await connectToDatabase();

        const user = await User.findById(session.user.id).select('-password');

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                country: user.country,
                investmentGoals: user.investmentGoals,
                riskTolerance: user.riskTolerance,
                preferredIndustry: user.preferredIndustry,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Failed to fetch profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}
