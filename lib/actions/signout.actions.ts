'use server';

import { cookies } from 'next/headers';

export const signOutAction = async () => {
    try {
        console.log('🚪 Server-side sign-out initiated');

        const cookieStore = await cookies();

        // Clear all potential better-auth related cookies
        const cookieNames = [
            'better-auth.session_token',
            'sessionToken',
            'authToken',
            'auth_token',
            'better_auth_session',
            'session'
        ];

        cookieNames.forEach(name => {
            try {
                cookieStore.delete(name);
                console.log(`✅ Deleted cookie: ${name}`);
            } catch (e) {
                // Cookie might not exist, that's fine
            }
        });

        console.log('✅ Server-side sign-out completed');
        return { success: true };
    } catch (error) {
        console.error('❌ Sign-out error:', error);
        throw error;
    }
};
