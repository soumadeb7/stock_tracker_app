'use server';

import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { headers } from "next/headers";

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({ body: { email, password, name: fullName } });

        if (!response) {
            return { success: false, error: 'Unable to create account. Please try again.' };
        }

        await inngest.send({
            name: 'app/user.created',
            data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
        });

        return { success: true, data: response };
    } catch (e) {
        console.log('Sign up failed', e);
        const message = e instanceof Error ? e.message : 'Sign up failed';
        return { success: false, error: message };
    }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({ body: { email, password } });

        if (!response) {
            return { success: false, error: 'Invalid email or password.' };
        }

        return { success: true, data: response };
    } catch (e) {
        console.log('Sign in failed', e);
        const message = e instanceof Error ? e.message : 'Sign in failed';
        return { success: false, error: message };
    }
};

export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e);
        return { success: false, error: 'Sign out failed' };
    }
};