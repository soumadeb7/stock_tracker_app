'use server';

import { getAuthInstance } from '@/lib/better-auth/init';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';

export async function saveUserProfile(profileData: {
    country?: string;
    investmentGoals?: string;
    riskTolerance?: string;
    preferredIndustry?: string;
}) {
    try {
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        await connectToDatabase();
        const db = (await connectToDatabase()).connection.db;

        if (!db) {
            return { success: false, error: 'Database connection failed' };
        }

        const result = await db.collection('user').updateOne(
            { id: userId },
            {
                $set: {
                    email: userEmail,
                    ...profileData,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return { success: false, error: 'User not found' };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error('[saveUserProfile] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to save profile' };
    }
}

export async function getUserProfile() {
    try {
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const userEmail = session.user.email;

        await connectToDatabase();
        const db = (await connectToDatabase()).connection.db;

        if (!db) {
            return { success: false, error: 'Database connection failed' };
        }

        const user = await db.collection('user').findOne(
            { email: userEmail },
            { projection: { password: 0 } }
        );

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        return {
            success: true,
            data: {
                id: user.id || user._id?.toString(),
                name: user.name,
                email: user.email,
                country: user.country,
                investmentGoals: user.investmentGoals,
                riskTolerance: user.riskTolerance,
                preferredIndustry: user.preferredIndustry,
                createdAt: user.createdAt,
            }
        };
    } catch (error) {
        console.error('[getUserProfile] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch profile' };
    }
}
