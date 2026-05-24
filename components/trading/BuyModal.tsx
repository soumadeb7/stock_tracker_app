"use client";
import React, { useMemo, useState } from "react";
import { getMockQuote } from "@/lib/trading/pricing";
import type { TradingOrderRequest } from "@/lib/types";
import { toast } from "sonner";

type Props = {
  symbol: string;
  company?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: { portfolio: unknown; transaction: unknown }) => void;
};

const BuyModal = ({ symbol, company, open, onClose, onSuccess }: Props) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const quote = useMemo(() => getMockQuote(symbol, company), [symbol, company]);
  const price = quote?.price || 0;
  const total = Math.round(quantity * price * 100) / 100;

  const notifyPortfolioUpdate = (portfolio: unknown, transaction: unknown) => {
    if (typeof window === 'undefined') {
      return;
    }

    const detail = { portfolio, transaction };

    window.dispatchEvent(new CustomEvent('trading:portfolio-updated', { detail }));

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('trading');
      channel.postMessage({ type: 'portfolio.update', ...detail });
      channel.close();
    }
  };

  const validate = () => {
    if (!symbol) return 'Invalid symbol';
    if (!Number.isFinite(quantity) || quantity <= 0) return 'Quantity must be greater than zero';
    if (!Number.isFinite(price) || price <= 0) return 'Invalid price';
    return '';
  };

  const handleBuy = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);

    try {
      const body: TradingOrderRequest = {
        symbol,
        assetName: company || symbol,
        side: 'buy',
        quantity: Math.floor(quantity),
      };

      const res = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        const message = data?.error || 'Failed to execute buy order';
        toast.error(String(message));
        return;
      }

      toast.success('Buy order executed');

      const portfolio = data?.data?.portfolio;
      const transaction = data?.data?.transaction;

      notifyPortfolioUpdate(portfolio, transaction);
      onSuccess?.({ portfolio, transaction });
      onClose();
    } catch (e) {
      toast.error('Buy failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />

      <div className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Buy {symbol}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{company || quote.assetName}</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="font-medium">${price.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-medium">${total.toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
            className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            className="px-4 h-10 rounded bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-gray-200"
            onClick={() => !loading && onClose()}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 h-10 rounded bg-yellow-500 text-white disabled:opacity-60"
            onClick={handleBuy}
            disabled={loading}
          >
            {loading ? 'Buying...' : `Buy ${quantity} `}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyModal;
