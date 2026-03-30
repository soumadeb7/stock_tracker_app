import { getAuthInstance } from '@/lib/better-auth/init';
import { connectToDatabase } from '@/database/mongoose';
import { User } from '@/database/models/user.model';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { country, investmentGoals, riskTolerance, preferredIndustry } = body;

        console.log('✅ Saving profile for user:', session.user.id);

        await connectToDatabase();

        const user = await User.findByIdAndUpdate(
            session.user.id,
            {
                country,
                investmentGoals,
                riskTolerance,
                preferredIndustry,
            },
            { new: true }
        ).select('-password');

        if (!user) {
            console.error('❌ User not found for profile update');
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        console.log('✅ Profile saved successfully');

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
            },
        });
    } catch (error) {
        console.error('❌ Failed to save profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save profile' },
            { status: 500 }
        );
    }
}
