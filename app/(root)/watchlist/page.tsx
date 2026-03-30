'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/better-auth/client';
import { useRouter } from 'next/navigation';
import WatchlistButton from '@/components/WatchlistButton';

type WatchlistItem = {
    symbol: string;
    company: string;
    addedAt: string;
};

export default function WatchlistPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isPending && !session?.user) {
            router.push('/sign-in');
        }
    }, [isPending, session, router]);

    useEffect(() => {
        const loadWatchlist = async () => {
            if (!session?.user) return;

            setLoading(true);
            setError('');

            try {
                const res = await fetch('/api/watchlist', {
                    method: 'GET',
                    credentials: 'include',
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to load watchlist');
                }

                const loadedItems = Array.isArray(data?.items) ? data.items : [];
                loadedItems.sort((a, b) => {
                    const aTime = new Date(a.addedAt || 0).getTime();
                    const bTime = new Date(b.addedAt || 0).getTime();
                    return bTime - aTime;
                });
                setItems(loadedItems);
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Failed to load watchlist';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        if (!isPending && session?.user) {
            loadWatchlist();
        }
    }, [isPending, session]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;

        return items.filter((item) => {
            const symbol = item.symbol.toLowerCase();
            const company = item.company.toLowerCase();
            return symbol.includes(q) || company.includes(q);
        });
    }, [items, search]);

    const newestItem = useMemo(() => {
        if (items.length === 0) return null;
        return items[0];
    }, [items]);

    if (isPending || loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-gray-500">Loading watchlist...</p>
            </div>
        );
    }

    if (!session?.user) return null;

    const formatDate = (dateValue: string) => {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'Unknown date';

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <section className="max-w-6xl mx-auto w-full">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Watchlist</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Track your saved stocks and manage them quickly.
                    </p>
                </div>
                <Link href="/" className="yellow-btn h-10 px-4 text-sm inline-flex items-center justify-center w-fit">
                    Browse Markets
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <p className="text-xs text-gray-500">Total Stocks</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{items.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <p className="text-xs text-gray-500">Showing</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredItems.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <p className="text-xs text-gray-500">Latest Added</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {newestItem ? `${newestItem.symbol} • ${formatDate(newestItem.addedAt)}` : 'No stocks yet'}
                    </p>
                </div>
            </div>

            <div className="mb-6">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by symbol or company"
                    className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                />
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 mb-6">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            ) : null}

            {items.length === 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-8 text-center bg-white dark:bg-slate-900">
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Your watchlist is empty.</p>
                    <p className="text-sm text-gray-500">Add stocks from any stock page using the watchlist button.</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-8 text-center bg-white dark:bg-slate-900">
                    <p className="text-gray-600 dark:text-gray-400 mb-2">No matching stocks found.</p>
                    <p className="text-sm text-gray-500">Try a different symbol or company name.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredItems.map((item) => (
                        <article
                            key={item.symbol}
                            className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                                        {item.symbol}
                                    </span>
                                    <span className="text-xs text-gray-500">Added {formatDate(item.addedAt)}</span>
                                </div>
                                <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 truncate">
                                    {item.company}
                                </p>
                                <Link
                                    href={`/stocks/${item.symbol}`}
                                    className="inline-block mt-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    View details
                                </Link>
                            </div>

                            <WatchlistButton
                                symbol={item.symbol}
                                company={item.company}
                                isInWatchlist={true}
                                showTrashIcon
                                onWatchlistChange={(symbol, isNowInWatchlist) => {
                                    if (!isNowInWatchlist) {
                                        setItems((prev) => prev.filter((x) => x.symbol !== symbol));
                                    }
                                }}
                            />
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
