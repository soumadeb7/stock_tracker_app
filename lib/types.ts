export type User = {
    name: string;
    email: string;
};

export type TradingSide = 'buy' | 'sell';

export type TradingTransactionStatus = 'filled' | 'rejected';

export type TradingHolding = {
    symbol: string;
    assetName: string;
    quantity: number;
    averageBuyPrice: number;
    currentPrice: number;
    marketValue: number;
    totalValue?: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
};

export type TradingAllocationItem = {
    symbol: string;
    assetName: string;
    value: number;
    percentage: number;
};

export type TradingPortfolioSummary = {
    initialBalance: number;
    availableBalance: number;
    investedAmount: number;
    holdingsValue: number;
    totalPortfolioValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    unrealizedPnL: number;
    realizedPnL: number;
    holdingsCount: number;
};

export type TradingPortfolioResponse = {
    userId: string;
    userEmail: string;
    summary: TradingPortfolioSummary;
    holdings: TradingHolding[];
    allocation: TradingAllocationItem[];
    updatedAt: string;
};

export type TradingTransaction = {
    transactionId: string;
    symbol: string;
    assetName: string;
    side: TradingSide;
    quantity: number;
    price: number;
    totalAmount: number;
    status: TradingTransactionStatus;
    executedAt: string;
    realizedPnL?: number;
    balanceAfter: number;
    holdingsAfter: number;
    note?: string;
};

export type TradingTransactionsResponse = {
    items: TradingTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type TradingOrderRequest = {
    symbol: string;
    assetName?: string;
    side: TradingSide;
    quantity: number;
};

export type TradingOrderResponse = {
    success: boolean;
    message: string;
    portfolio: TradingPortfolioResponse;
    transaction: TradingTransaction;
};

export type StockWithWatchlistStatus = {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    isInWatchlist?: boolean;
};

export type SearchCommandProps = {
    renderAs?: "button" | "text";
    label?: string;
    initialStocks?: StockWithWatchlistStatus[];
};

export type WatchlistButtonProps = {
    symbol: string;
    company: string;
    isInWatchlist: boolean;
    showTrashIcon?: boolean;
    type?: "button" | "icon";
    onWatchlistChange?: (symbol: string, isInWatchlist: boolean) => void;
};
