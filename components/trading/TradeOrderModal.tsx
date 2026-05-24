'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Loader2, ShieldCheck, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils';
import { getMockQuote } from '@/lib/trading/pricing';
import type { TradingSide } from '@/lib/types';

type TradeOrderModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    symbol: string;
    assetName: string;
    initialSide?: TradingSide;
    onTradeCompleted?: () => Promise<void> | void;
};

type PortfolioPreview = {
    availableBalance: number;
    ownedQuantity: number;
};

const INITIAL_QUANTITY = '1';

export default function TradeOrderModal({
    open,
    onOpenChange,
    symbol,
    assetName,
    initialSide = 'buy',
    onTradeCompleted,
}: TradeOrderModalProps) {
    const [side, setSide] = useState<TradingSide>(initialSide);
    const [quantity, setQuantity] = useState(INITIAL_QUANTITY);
    const [quote, setQuote] = useState(() => getMockQuote(symbol));
    const [loadingPortfolio, setLoadingPortfolio] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [portfolioPreview, setPortfolioPreview] = useState<PortfolioPreview>({ availableBalance: 0, ownedQuantity: 0 });
    const [error, setError] = useState('');

    const normalizedQuantity = Math.max(1, Math.floor(Number(quantity) || 0));
    const totalAmount = Number((normalizedQuantity * quote.price).toFixed(2));
    const isBuy = side === 'buy';
    const balanceShortage = !loadingPortfolio && portfolioPreview.availableBalance < totalAmount;
    const holdingShortage = !loadingPortfolio && portfolioPreview.ownedQuantity < normalizedQuantity;

    useEffect(() => {
        setSide(initialSide);
    }, [initialSide, open]);

    useEffect(() => {
        if (!open) {
            setReviewOpen(false);
            setError('');
            return;
        }

        const refreshQuote = () => setQuote(getMockQuote(symbol));
        refreshQuote();

        const refreshPortfolio = async () => {
            setLoadingPortfolio(true);
            try {
                const response = await fetch('/api/trading/portfolio', { credentials: 'include' });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || 'Failed to load portfolio state');
                }

                const holdings = Array.isArray(data?.data?.holdings) ? data.data.holdings : [];
                const match = holdings.find((holding: { symbol: string }) => holding.symbol === symbol.toUpperCase());

                setPortfolioPreview({
                    availableBalance: Number(data?.data?.summary?.availableBalance || 0),
                    ownedQuantity: Number(match?.quantity || 0),
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load portfolio state';
                setError(message);
            } finally {
                setLoadingPortfolio(false);
            }
        };

        refreshPortfolio();
        const intervalId = window.setInterval(refreshQuote, 15000);

        return () => window.clearInterval(intervalId);
    }, [open, symbol]);

    const validationMessage = useMemo(() => {
        if (loadingPortfolio) {
            return '';
        }

        if (!normalizedQuantity) {
            return 'Enter a valid quantity.';
        }

        if (!isBuy && holdingShortage) {
            return 'You cannot sell more than you currently own.';
        }

        if (isBuy && balanceShortage) {
            return 'Your virtual balance is not enough for this order.';
        }

        return '';
    }, [balanceShortage, holdingShortage, isBuy, loadingPortfolio, normalizedQuantity]);

    const orderLabel = isBuy ? 'Buy' : 'Sell';
    const orderIcon = isBuy ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />;

    const submitOrder = async () => {
        setSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/trading/orders', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol,
                    assetName,
                    side,
                    quantity: normalizedQuantity,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'Failed to execute simulated trade');
            }

            toast.success(data?.message || 'Simulated trade executed');

            if (typeof window !== 'undefined') {
                const detail = {
                    portfolio: data?.data?.portfolio,
                    transaction: data?.data?.transaction,
                };

                window.dispatchEvent(new CustomEvent('trading:portfolio-updated', { detail }));

                if ('BroadcastChannel' in window) {
                    const channel = new BroadcastChannel('trading');
                    channel.postMessage({ type: 'portfolio.update', ...detail });
                    channel.close();
                }
            }

            setQuantity(INITIAL_QUANTITY);
            setReviewOpen(false);
            onOpenChange(false);

            await onTradeCompleted?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to execute simulated trade';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl border-gray-700 bg-gray-900 text-gray-100">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-white">Simulated {assetName} trade</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Market orders execute instantly against the virtual balance and mock quote engine.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800/80 p-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    variant={isBuy ? 'default' : 'outline'}
                                    className="justify-start"
                                    onClick={() => setSide('buy')}
                                >
                                    <ArrowUpCircle className="h-4 w-4" />
                                    Market Buy
                                </Button>
                                <Button
                                    type="button"
                                    variant={!isBuy ? 'default' : 'outline'}
                                    className="justify-start"
                                    onClick={() => setSide('sell')}
                                >
                                    <ArrowDownCircle className="h-4 w-4" />
                                    Market Sell
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="trade-quantity" className="text-gray-300">Quantity</Label>
                                <Input
                                    id="trade-quantity"
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={quantity}
                                    onChange={(event) => setQuantity(event.target.value)}
                                    className="h-11 border-gray-700 bg-gray-950 text-gray-100"
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-gray-700 bg-gray-950 p-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current price</p>
                                    <p className="mt-1 text-xl font-semibold text-white">{formatPrice(quote.price)}</p>
                                    <p className={quote.change >= 0 ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>
                                        {quote.change >= 0 ? '+' : ''}{formatPrice(Math.abs(quote.change))} ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent}%)
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-700 bg-gray-950 p-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Order total</p>
                                    <p className="mt-1 text-xl font-semibold text-white">{formatPrice(totalAmount)}</p>
                                    <p className="text-sm text-gray-400">{orderLabel} {normalizedQuantity} share{normalizedQuantity === 1 ? '' : 's'}</p>
                                </div>
                            </div>

                            {error ? (
                                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            ) : validationMessage ? (
                                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{validationMessage}</span>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                            <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-950 to-gray-900 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Symbol</p>
                                        <p className="text-lg font-semibold text-white">{symbol.toUpperCase()}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isBuy ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                        {orderIcon}
                                        {orderLabel} order
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Available balance</p>
                                        <p className="text-sm font-medium text-white">{loadingPortfolio ? 'Loading...' : formatPrice(portfolioPreview.availableBalance)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Shares owned</p>
                                        <p className="text-sm font-medium text-white">{loadingPortfolio ? 'Loading...' : portfolioPreview.ownedQuantity}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-700 bg-gray-950 p-4 text-sm text-gray-300">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 text-teal-400" />
                                    <p>
                                        Orders are simulated only. No brokerage, payment, or settlement integration is used.
                                    </p>
                                </div>
                                <div className="mt-3 flex items-start gap-2">
                                    <Wallet className="mt-0.5 h-4 w-4 text-yellow-400" />
                                    <p>
                                        The wallet updates instantly and all portfolio values recalculate after execution.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => setReviewOpen(true)}
                            disabled={Boolean(validationMessage) || loadingPortfolio || submitting}
                            className="yellow-btn h-11 px-5"
                        >
                            Review order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogContent className="sm:max-w-lg border-gray-700 bg-gray-900 text-gray-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-white">Confirm {orderLabel.toLowerCase()} order</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Confirm this simulated order before it is executed instantly.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 rounded-2xl border border-gray-700 bg-gray-800/70 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-400">Asset</span>
                            <span className="font-semibold text-white">{assetName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-400">Side</span>
                            <span className={`font-semibold ${isBuy ? 'text-emerald-300' : 'text-rose-300'}`}>{orderLabel}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-400">Quantity</span>
                            <span className="font-semibold text-white">{normalizedQuantity}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-400">Execution price</span>
                            <span className="font-semibold text-white">{formatPrice(quote.price)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-400">Total amount</span>
                            <span className="font-semibold text-white">{formatPrice(totalAmount)}</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewOpen(false)} className="border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800">
                            Back
                        </Button>
                        <Button onClick={submitOrder} disabled={submitting} className="yellow-btn h-11 px-5">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Confirm trade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}