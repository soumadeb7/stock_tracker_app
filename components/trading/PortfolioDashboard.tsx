'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Download,
    Search,
    SlidersHorizontal,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';

import TradeOrderModal from '@/components/trading/TradeOrderModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils';
import type {
    TradingPortfolioResponse,
    TradingSide,
    TradingTransaction,
} from '@/lib/types';

type TransactionPage = {
    items: TradingTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

type TradeTarget = {
    symbol: string;
    assetName: string;
    side: TradingSide;
};

const HOLDING_SORT_OPTIONS = [
    { value: 'value', label: 'Value' },
    { value: 'profit', label: 'Profit/Loss' },
    { value: 'name', label: 'Name' },
] as const;

const TRANSACTION_TYPE_OPTIONS = [
    { value: 'all', label: 'All types' },
    { value: 'buy', label: 'Buys only' },
    { value: 'sell', label: 'Sells only' },
] as const;

const TRANSACTION_SORT_OPTIONS = [
    { value: 'executedAt-desc', label: 'Newest first' },
    { value: 'executedAt-asc', label: 'Oldest first' },
    { value: 'side-desc', label: 'By type' },
] as const;

const INITIAL_LIMIT = 8;

export default function PortfolioDashboard() {
    const [portfolio, setPortfolio] = useState<TradingPortfolioResponse | null>(null);
    const [transactions, setTransactions] = useState<TransactionPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [holdingsQuery, setHoldingsQuery] = useState('');
    const [holdingSort, setHoldingSort] = useState<(typeof HOLDING_SORT_OPTIONS)[number]['value']>('value');
    const [transactionQuery, setTransactionQuery] = useState('');
    const [transactionType, setTransactionType] = useState<(typeof TRANSACTION_TYPE_OPTIONS)[number]['value']>('all');
    const [transactionSort, setTransactionSort] = useState<(typeof TRANSACTION_SORT_OPTIONS)[number]['value']>('executedAt-desc');
    const [transactionPage, setTransactionPage] = useState(1);
    const [selectedTransaction, setSelectedTransaction] = useState<TradingTransaction | null>(null);
    const [activeTrade, setActiveTrade] = useState<TradeTarget | null>(null);

    const loadPortfolio = useCallback(async () => {
        const response = await fetch('/api/trading/portfolio', { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.error || 'Failed to load portfolio');
        }

        return data?.data as TradingPortfolioResponse;
    }, []);

    const loadTransactions = useCallback(async (page: number) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(INITIAL_LIMIT),
            search: transactionQuery,
            type: transactionType,
        });

        const [sortBy, sortOrder] = transactionSort.split('-') as ['executedAt' | 'side', 'asc' | 'desc'];
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);

        const response = await fetch(`/api/trading/transactions?${params.toString()}`, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.error || 'Failed to load transaction history');
        }

        return data?.data as TransactionPage;
    }, [transactionQuery, transactionType, transactionSort]);

    const refreshData = useCallback(async (page: number) => {
        try {
            setLoading(true);
            setError('');

            const [portfolioData, transactionData] = await Promise.all([
                loadPortfolio(),
                loadTransactions(page),
            ]);

            setPortfolio(portfolioData);
            setTransactions(transactionData);
            setTransactionPage(transactionData.page);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load portfolio';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [loadPortfolio, loadTransactions]);

    useEffect(() => {
        void refreshData(1);

        const intervalId = window.setInterval(() => {
            void refreshData(transactionPage);
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, [refreshData, transactionPage]);

    useEffect(() => {
        // Refresh data when transaction filters or sort change.
        void refreshData(1);
    }, [refreshData, transactionQuery, transactionType, transactionSort]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handlePortfolioUpdate = () => {
            void refreshData(transactionPage);
        };

        const handleChannelMessage = (event: MessageEvent) => {
            if (event.data?.type === 'portfolio.update') {
                handlePortfolioUpdate();
            }
        };

        const channel = 'BroadcastChannel' in window ? new BroadcastChannel('trading') : null;
        channel?.addEventListener('message', handleChannelMessage);
        window.addEventListener('trading:portfolio-updated', handlePortfolioUpdate as EventListener);

        return () => {
            channel?.removeEventListener('message', handleChannelMessage);
            channel?.close();
            window.removeEventListener('trading:portfolio-updated', handlePortfolioUpdate as EventListener);
        };
    }, [refreshData, transactionPage]);

    useEffect(() => {
        // Load transactions when the page changes.
        void loadTransactions(transactionPage)
            .then(setTransactions)
            .catch((err) => {
                const message = err instanceof Error ? err.message : 'Failed to load transaction history';
                setError(message);
            });
    }, [loadTransactions, transactionPage]);

    const holdings = useMemo(() => portfolio?.holdings || [], [portfolio]);

    const filteredHoldings = useMemo(() => {
        const q = holdingsQuery.trim().toLowerCase();
        const base = holdings.filter((holding) => {
            if (!q) return true;
            return holding.symbol.toLowerCase().includes(q) || holding.assetName.toLowerCase().includes(q);
        });

        const sorted = [...base].sort((a, b) => {
            if (holdingSort === 'name') {
                return a.assetName.localeCompare(b.assetName);
            }

            if (holdingSort === 'profit') {
                return b.unrealizedPnL - a.unrealizedPnL;
            }

            return b.marketValue - a.marketValue;
        });

        return sorted;
    }, [holdings, holdingsQuery, holdingSort]);

    const analytics = useMemo(() => {
        if (!portfolio) {
            return { winners: 0, losers: 0, concentration: 0 };
        }

        const winners = holdings.filter((holding) => holding.unrealizedPnL >= 0).length;
        const losers = holdings.filter((holding) => holding.unrealizedPnL < 0).length;
        const concentration = portfolio.summary.holdingsValue > 0
            ? Math.max(...portfolio.allocation.map((item) => item.percentage), 0)
            : 0;

        return { winners, losers, concentration };
    }, [holdings, portfolio]);

    const transactionSlice = transactions?.items || [];
    const totalPages = transactions?.totalPages || 1;

    if (loading) {
        return (
            <section className="mx-auto max-w-7xl space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-32 animate-pulse rounded-2xl border border-gray-700 bg-gray-800/60" />
                    ))}
                </div>
                <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                    <div className="h-[520px] animate-pulse rounded-2xl border border-gray-700 bg-gray-800/60" />
                    <div className="h-[520px] animate-pulse rounded-2xl border border-gray-700 bg-gray-800/60" />
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
                <h1 className="text-2xl font-semibold text-white">Trading dashboard unavailable</h1>
                <p className="mt-2 text-sm text-red-200">{error}</p>
                <Button className="mt-4 yellow-btn h-11 px-5" onClick={() => refreshData(1)}>
                    Retry loading
                </Button>
            </section>
        );
    }

    if (!portfolio) {
        return null;
    }

    const handleTradeSuccess = async () => {
        await refreshData(transactionPage);
    };

    return (
        <section className="mx-auto max-w-7xl space-y-6 pb-10">
            <div className="overflow-hidden rounded-3xl border border-gray-700 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.24)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-3">
                        <p className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-yellow-300">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Simulated trading
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Portfolio management and transaction history</h1>
                        <p className="text-sm text-gray-400 sm:text-base">
                            Track your virtual balance, holdings performance, order history, and allocation across simulated positions.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button className="yellow-btn h-11 px-5" onClick={() => setActiveTrade({ symbol: 'AAPL', assetName: 'AAPL', side: 'buy' })}>
                            <ArrowUpCircle className="h-4 w-4" />
                            Quick buy
                        </Button>
                        <Button variant="outline" className="h-11 border-gray-700 bg-gray-950/40 px-5 text-gray-100 hover:bg-gray-800" onClick={() => setActiveTrade({ symbol: 'AAPL', assetName: 'AAPL', side: 'sell' })}>
                            <ArrowDownCircle className="h-4 w-4" />
                            Quick sell
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total portfolio value" value={formatPrice(portfolio.summary.totalPortfolioValue)} subtitle={`${portfolio.summary.totalPnLPercent >= 0 ? '+' : ''}${portfolio.summary.totalPnLPercent}% P/L`} icon={<TrendingUp className="h-5 w-5" />} accent="from-emerald-500/20 to-emerald-500/5" />
                <MetricCard title="Available balance" value={formatPrice(portfolio.summary.availableBalance)} subtitle="Virtual wallet funds" icon={<Wallet className="h-5 w-5" />} accent="from-yellow-500/20 to-yellow-500/5" />
                <MetricCard title="Invested amount" value={formatPrice(portfolio.summary.investedAmount)} subtitle={`${portfolio.summary.holdingsCount} open positions`} icon={<SlidersHorizontal className="h-5 w-5" />} accent="from-blue-500/20 to-blue-500/5" />
                <MetricCard title="Unrealized P/L" value={formatPrice(portfolio.summary.unrealizedPnL)} subtitle={`${analytics.winners} winners • ${analytics.losers} losers`} icon={<TrendingDown className="h-5 w-5" />} accent="from-rose-500/20 to-rose-500/5" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <div className="space-y-6 rounded-3xl border border-gray-700 bg-gray-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Holdings</h2>
                            <p className="text-sm text-gray-400">Search, sort, and review your simulated positions.</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <Input value={holdingsQuery} onChange={(event) => setHoldingsQuery(event.target.value)} placeholder="Search holdings" className="h-11 border-gray-700 bg-gray-950 pl-9 text-gray-100" />
                            </div>
                            <select value={holdingSort} onChange={(event) => setHoldingSort(event.target.value as typeof holdingSort)} className="h-11 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100">
                                {HOLDING_SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <Button variant="outline" className="h-11 border-gray-700 bg-gray-950 text-gray-100 hover:bg-gray-800" onClick={() => refreshData(transactionPage)}>
                                <Download className="h-4 w-4" />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {filteredHoldings.length === 0 ? (
                        <EmptyState
                            title="No holdings yet"
                            description="Your virtual portfolio is empty. Use the stock page trade panel to make your first buy order."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700 text-sm">
                                <thead className="text-left text-xs uppercase tracking-[0.16em] text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Asset</th>
                                        <th className="px-4 py-3">Quantity</th>
                                        <th className="px-4 py-3">Avg buy</th>
                                        <th className="px-4 py-3">Current</th>
                                        <th className="px-4 py-3">Value</th>
                                        <th className="px-4 py-3">P/L</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {filteredHoldings.map((holding) => (
                                        <tr key={holding.symbol} className="transition-colors hover:bg-gray-800/60">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-white">{holding.assetName}</span>
                                                    <span className="text-xs uppercase tracking-[0.18em] text-gray-500">{holding.symbol}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-gray-200">{holding.quantity}</td>
                                            <td className="px-4 py-4 text-gray-200">{formatPrice(holding.averageBuyPrice)}</td>
                                            <td className="px-4 py-4 text-gray-200">{formatPrice(holding.currentPrice)}</td>
                                            <td className="px-4 py-4 text-white">{formatPrice(holding.marketValue)}</td>
                                            <td className={`px-4 py-4 font-semibold ${holding.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {holding.unrealizedPnL >= 0 ? '+' : ''}{formatPrice(holding.unrealizedPnL)}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" className="border-gray-700 bg-transparent text-gray-100 hover:bg-gray-800" onClick={() => setActiveTrade({ symbol: holding.symbol, assetName: holding.assetName, side: 'buy' })}>
                                                        Buy
                                                    </Button>
                                                    <Button size="sm" className="yellow-btn h-9 px-3" onClick={() => setActiveTrade({ symbol: holding.symbol, assetName: holding.assetName, side: 'sell' })}>
                                                        Sell
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-700 bg-gray-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Allocation</h2>
                                <p className="text-sm text-gray-400">Top weighted positions in your simulated portfolio.</p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            {portfolio.allocation.length === 0 ? (
                                <EmptyState
                                    title="No allocation yet"
                                    description="Open positions will appear here once you place a buy order."
                                    compact
                                />
                            ) : (
                                portfolio.allocation.slice(0, 6).map((item) => (
                                    <div key={item.symbol} className="space-y-1 rounded-2xl border border-gray-800 bg-gray-950/60 p-3">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <div>
                                                <p className="font-medium text-white">{item.assetName}</p>
                                                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{item.symbol}</p>
                                            </div>
                                            <p className="font-semibold text-yellow-300">{item.percentage}%</p>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                                            <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-emerald-400" style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                                        </div>
                                        <p className="text-xs text-gray-500">{formatPrice(item.value)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-700 bg-gray-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                        <h2 className="text-xl font-semibold text-white">Portfolio analytics</h2>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            <AnalyticsChip label="Open positions" value={String(portfolio.summary.holdingsCount)} />
                            <AnalyticsChip label="Concentration" value={`${analytics.concentration.toFixed(2)}%`} />
                            <AnalyticsChip label="Cash ratio" value={`${portfolio.summary.totalPortfolioValue > 0 ? ((portfolio.summary.availableBalance / portfolio.summary.totalPortfolioValue) * 100).toFixed(2) : '0.00'}%`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-3xl border border-gray-700 bg-gray-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Transaction history</h2>
                            <p className="text-sm text-gray-400">Search, filter, sort, and inspect each simulated order.</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <Input value={transactionQuery} onChange={(event) => setTransactionQuery(event.target.value)} placeholder="Search history" className="h-11 border-gray-700 bg-gray-950 pl-9 text-gray-100" />
                            </div>
                            <select value={transactionType} onChange={(event) => setTransactionType(event.target.value as typeof transactionType)} className="h-11 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100">
                                {TRANSACTION_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <select value={transactionSort} onChange={(event) => setTransactionSort(event.target.value as typeof transactionSort)} className="h-11 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100">
                                {TRANSACTION_SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-800">
                        {transactionSlice.length === 0 ? (
                            <EmptyState
                                title="No transactions yet"
                                description="Buy or sell a simulated position to populate the history module."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-800 text-sm">
                                    <thead className="bg-gray-950/70 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Asset</th>
                                            <th className="px-4 py-3">Qty</th>
                                            <th className="px-4 py-3">Total</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800 bg-gray-900/60">
                                        {transactionSlice.map((transaction) => (
                                            <tr key={transaction.transactionId} className="cursor-pointer transition-colors hover:bg-gray-800/70" onClick={() => setSelectedTransaction(transaction)}>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${transaction.side === 'buy' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                                        {transaction.side === 'buy' ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
                                                        {transaction.side.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-white">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{transaction.assetName}</span>
                                                        <span className="text-xs text-gray-500">{transaction.symbol}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-gray-200">{transaction.quantity}</td>
                                                <td className="px-4 py-4 text-white">{formatPrice(transaction.totalAmount)}</td>
                                                <td className="px-4 py-4">
                                                    <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">{transaction.status}</span>
                                                </td>
                                                <td className="px-4 py-4 text-gray-300">{new Date(transaction.executedAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-400">
                            Showing page {transactions?.page || 1} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="border-gray-700 bg-transparent text-gray-100 hover:bg-gray-800" disabled={(transactions?.page || 1) <= 1} onClick={() => setTransactionPage((current) => Math.max(1, current - 1))}>
                                <ChevronLeft className="h-4 w-4" />
                                Prev
                            </Button>
                            <Button variant="outline" size="sm" className="border-gray-700 bg-transparent text-gray-100 hover:bg-gray-800" disabled={(transactions?.page || 1) >= totalPages} onClick={() => setTransactionPage((current) => current + 1)}>
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-700 bg-gray-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                        <h2 className="text-xl font-semibold text-white">Transaction summary</h2>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <AnalyticsChip label="Total transactions" value={String(transactions?.total || 0)} />
                            <AnalyticsChip label="Transaction filters" value={`${transactionType.toUpperCase()} / ${transactionSort.replace('-', ' ')}`} />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-700 bg-gray-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                        <h2 className="text-xl font-semibold text-white">Portfolio flow</h2>
                        <p className="mt-2 text-sm text-gray-400">
                            Buy orders reduce the virtual wallet. Sell orders restore cash and recalculate portfolio totals immediately.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-300">
                            <p className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-emerald-400" /> Market buy: wallet decreases, holdings increase.</p>
                            <p className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-rose-400" /> Market sell: wallet increases, holdings decrease.</p>
                            <p className="flex items-center gap-2"><Wallet className="h-4 w-4 text-yellow-400" /> All values are simulated and stored in MongoDB for the current user.</p>
                        </div>
                    </div>
                </div>
            </div>

            <TradeOrderModal
                open={Boolean(activeTrade)}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveTrade(null);
                    }
                }}
                symbol={activeTrade?.symbol || 'AAPL'}
                assetName={activeTrade?.assetName || 'AAPL'}
                initialSide={activeTrade?.side || 'buy'}
                onTradeCompleted={handleTradeSuccess}
            />

            <Dialog open={Boolean(selectedTransaction)} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
                <DialogContent className="sm:max-w-lg border-gray-700 bg-gray-900 text-gray-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-white">Transaction details</DialogTitle>
                        <DialogDescription className="text-gray-400">Export-ready transaction payload for reporting and analysis.</DialogDescription>
                    </DialogHeader>

                    {selectedTransaction ? (
                        <div className="space-y-3 rounded-2xl border border-gray-700 bg-gray-800/70 p-4 text-sm">
                            <DetailRow label="Transaction ID" value={selectedTransaction.transactionId} />
                            <DetailRow label="Type" value={selectedTransaction.side.toUpperCase()} />
                            <DetailRow label="Asset" value={`${selectedTransaction.assetName} (${selectedTransaction.symbol})`} />
                            <DetailRow label="Quantity" value={String(selectedTransaction.quantity)} />
                            <DetailRow label="Price" value={formatPrice(selectedTransaction.price)} />
                            <DetailRow label="Total amount" value={formatPrice(selectedTransaction.totalAmount)} />
                            <DetailRow label="Status" value={selectedTransaction.status} />
                            <DetailRow label="Timestamp" value={new Date(selectedTransaction.executedAt).toLocaleString()} />
                            <DetailRow label="Realized P/L" value={selectedTransaction.realizedPnL !== undefined ? formatPrice(selectedTransaction.realizedPnL) : 'N/A'} />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </section>
    );
}

function MetricCard({
    title,
    value,
    subtitle,
    icon,
    accent,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    accent: string;
}) {
    return (
        <div className={`rounded-2xl border border-gray-700 bg-gradient-to-br ${accent} p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)]`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{title}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                    <p className="mt-1 text-sm text-gray-300">{subtitle}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/90">{icon}</div>
            </div>
        </div>
    );
}

function AnalyticsChip({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{value}</p>
        </div>
    );
}

function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
    return (
        <div className={`rounded-2xl border border-dashed border-gray-700 bg-gray-950/40 ${compact ? 'p-4' : 'p-8 text-center'}`}>
            <p className="text-base font-semibold text-white">{title}</p>
            <p className="mt-2 text-sm text-gray-400">{description}</p>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-gray-400">{label}</span>
            <span className="max-w-[60%] break-all text-right font-medium text-white">{value}</span>
        </div>
    );
}