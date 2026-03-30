'use client';

import { useSession } from '@/lib/better-auth/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    country?: string;
    investmentGoals?: string;
    riskTolerance?: string;
    preferredIndustry?: string;
    createdAt?: string;
}

export const ProfileCard = () => {
    const { data: session, isPending } = useSession();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!session?.user) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/auth/profile');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setProfile(data.data);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch profile:', e);
            } finally {
                setLoading(false);
            }
        };

        if (!isPending) {
            fetchProfile();
        }
    }, [session?.user, isPending]);

    if (isPending || loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded mb-4 w-1/3"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-6 border-l-4 border-yellow-500">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                👤 Welcome, {profile?.name || session.user.name || 'Investor'}!
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-3 uppercase tracking-wide">
                        Personal Information
                    </h3>
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-gray-600 dark:text-gray-500">📧 Email</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white break-all">
                                {profile?.email || session.user.email}
                            </p>
                        </div>
                        {profile?.country && (
                            <div>
                                <p className="text-xs text-gray-600 dark:text-gray-500">🌍 Country</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {profile.country}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Investment Profile */}
                {(profile?.investmentGoals || profile?.riskTolerance || profile?.preferredIndustry) && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-3 uppercase tracking-wide">
                            Investment Profile
                        </h3>
                        <div className="space-y-2">
                            {profile?.investmentGoals && (
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-500">🎯 Investment Goals</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {profile.investmentGoals}
                                    </p>
                                </div>
                            )}
                            {profile?.riskTolerance && (
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-500">⚡ Risk Tolerance</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {profile.riskTolerance}
                                    </p>
                                </div>
                            )}
                            {profile?.preferredIndustry && (
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-500">🏭 Preferred Industry</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {profile.preferredIndustry}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3 flex-wrap">
                <Link
                    href="/inbox"
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                >
                    📬 View Inbox
                </Link>
                <button
                    onClick={async () => {
                        await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
                        window.location.href = '/sign-in';
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                    🚪 Sign Out
                </button>
            </div>
        </div>
    );
};
