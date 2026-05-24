import { connectToDatabase } from '@/database/mongoose';
import { TradingAccount } from '@/database/models/trading.model';
import { getMockQuote } from '@/lib/trading/pricing';
import type {
    TradingAllocationItem,
    TradingOrderRequest,
    TradingOrderResponse,
    TradingPortfolioResponse,
    TradingPortfolioSummary,
    TradingTransaction,
    TradingTransactionsResponse,
} from '@/lib/types';

const DEFAULT_INITIAL_BALANCE = 100000;
const DEFAULT_LIMIT = 8;

type TradingHoldingRecord = {
    symbol: string;
    assetName: string;
    quantity: number;
    averageBuyPrice: number;
};

type TradingTransactionRecord = TradingTransaction;

type TradingAccountRecord = {
    userId: string;
    userEmail: string;
    initialBalance: number;
    availableBalance: number;
    holdings: TradingHoldingRecord[];
    transactions: TradingTransactionRecord[];
    updatedAt: string;
};

declare global {
    // eslint-disable-next-line no-var
    var tradingFallbackStore: {
        accounts: Map<string, TradingAccountRecord>;
    } | undefined;
}

const fallbackStore = globalThis.tradingFallbackStore || {
    accounts: new Map<string, TradingAccountRecord>(),
};

globalThis.tradingFallbackStore = fallbackStore;

export class TradingError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = 'TradingError';
        this.statusCode = statusCode;
    }
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const nowIso = () => new Date().toISOString();

const toIsoString = (value: unknown) => {
    const date = value instanceof Date ? value : new Date(String(value || nowIso()));

    return Number.isNaN(date.getTime()) ? nowIso() : date.toISOString();
};

const isFiniteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

const normalizeAccount = (record?: Partial<TradingAccountRecord> | null): TradingAccountRecord => ({
    userId: String(record?.userId || ''),
    userEmail: String(record?.userEmail || ''),
    initialBalance: isFiniteNumber(record?.initialBalance) ? Number(record?.initialBalance) : DEFAULT_INITIAL_BALANCE,
    availableBalance: isFiniteNumber(record?.availableBalance) ? Math.max(0, Number(record?.availableBalance)) : DEFAULT_INITIAL_BALANCE,
    holdings: Array.isArray(record?.holdings)
        ? record.holdings.map((holding) => ({
            symbol: String(holding.symbol || '').trim().toUpperCase(),
            assetName: String(holding.assetName || holding.symbol || '').trim(),
            quantity: Math.max(0, Math.floor(Number(holding.quantity) || 0)),
            averageBuyPrice: roundMoney(Math.max(0, Number(holding.averageBuyPrice) || 0)),
        })).filter((holding) => holding.symbol && holding.quantity > 0)
        : [],
    transactions: Array.isArray(record?.transactions)
        ? record.transactions.map((transaction) => ({
            transactionId: String(transaction.transactionId || ''),
            symbol: String(transaction.symbol || '').trim().toUpperCase(),
            assetName: String(transaction.assetName || transaction.symbol || '').trim(),
            side: transaction.side === 'sell' ? 'sell' : 'buy',
            quantity: Math.max(1, Math.floor(Number(transaction.quantity) || 0)),
            price: roundMoney(Math.max(0, Number(transaction.price) || 0)),
            totalAmount: roundMoney(Math.max(0, Number(transaction.totalAmount) || 0)),
            status: transaction.status === 'rejected' ? 'rejected' : 'filled',
            executedAt: toIsoString(transaction.executedAt),
            realizedPnL: isFiniteNumber(transaction.realizedPnL) ? roundMoney(Number(transaction.realizedPnL)) : undefined,
            balanceAfter: roundMoney(Math.max(0, Number(transaction.balanceAfter) || 0)),
            holdingsAfter: Math.max(0, Math.floor(Number(transaction.holdingsAfter) || 0)),
            note: transaction.note ? String(transaction.note) : undefined,
        }))
        : [],
    updatedAt: toIsoString(record?.updatedAt),
});

const cloneAccount = (account: TradingAccountRecord): TradingAccountRecord => normalizeAccount(JSON.parse(JSON.stringify(account)) as TradingAccountRecord);

const buildAccountFilter = (userId: string, userEmail: string) => {
    const filter: Array<Record<string, string>> = [];

    if (userId) {
        filter.push({ userId });
    }

    if (userEmail) {
        filter.push({ userEmail });
    }

    return filter.length > 0 ? { $or: filter } : { userId };
};

const getAccountPriority = (account: TradingAccountRecord) => {
    const updatedAtScore = Number(new Date(account.updatedAt || 0).getTime()) || 0;
    const activityScore = account.holdings.length > 0 || account.transactions.length > 0 ? 1_000_000_000_000_000 : 0;

    return activityScore + updatedAtScore;
};

const syncAccountRecords = async (filter: ReturnType<typeof buildAccountFilter>, account: TradingAccountRecord) => {
    const normalized = normalizeAccount(account);

    const update = {
        $set: {
            userId: normalized.userId,
            userEmail: normalized.userEmail,
            initialBalance: normalized.initialBalance,
            availableBalance: normalized.availableBalance,
            holdings: normalized.holdings,
            transactions: normalized.transactions,
            updatedAt: new Date(normalized.updatedAt),
        },
        $setOnInsert: {
            userId: normalized.userId,
        },
    };

    const result = await TradingAccount.updateMany(filter, update);

    if (result.matchedCount === 0) {
        await TradingAccount.create({
            userId: normalized.userId,
            userEmail: normalized.userEmail,
            initialBalance: normalized.initialBalance,
            availableBalance: normalized.availableBalance,
            holdings: normalized.holdings,
            transactions: normalized.transactions,
            updatedAt: new Date(normalized.updatedAt),
        });
    }
};

async function loadAccountFromDatabase(userId: string, userEmail: string): Promise<TradingAccountRecord | null> {
    await connectToDatabase();

    const matches = await TradingAccount.find(buildAccountFilter(userId, userEmail)).lean<TradingAccountRecord[]>();

    if (matches.length > 0) {
        const normalizedMatches = matches.map((account) => normalizeAccount(account));
        const preferred = normalizedMatches.sort((left, right) => getAccountPriority(right) - getAccountPriority(left))[0];
        const resolved = normalizeAccount({
            ...preferred,
            userId,
            userEmail: userEmail || preferred.userEmail,
        });

        if (normalizedMatches.length > 1 || resolved.userId !== preferred.userId || resolved.userEmail !== preferred.userEmail) {
            await syncAccountRecords(buildAccountFilter(userId, userEmail), resolved);
        }

        return resolved;
    }

    const created = await TradingAccount.create({
        userId,
        userEmail,
        initialBalance: DEFAULT_INITIAL_BALANCE,
        availableBalance: DEFAULT_INITIAL_BALANCE,
        holdings: [],
        transactions: [],
    });

    return normalizeAccount(created.toObject() as TradingAccountRecord);
}

function loadAccountFromMemory(userId: string, userEmail: string): TradingAccountRecord {
    const existing = fallbackStore.accounts.get(userId);

    if (existing) {
        if (!existing.userEmail && userEmail) {
            existing.userEmail = userEmail;
        }

        return cloneAccount(existing);
    }

    const created = normalizeAccount({
        userId,
        userEmail,
        initialBalance: DEFAULT_INITIAL_BALANCE,
        availableBalance: DEFAULT_INITIAL_BALANCE,
        holdings: [],
        transactions: [],
        updatedAt: nowIso(),
    });

    fallbackStore.accounts.set(userId, cloneAccount(created));

    return created;
}

async function loadAccount(userId: string, userEmail: string): Promise<TradingAccountRecord> {
    try {
        return await loadAccountFromDatabase(userId, userEmail);
    } catch (error) {
        console.warn('[Trading] Using memory account fallback:', error);
        return loadAccountFromMemory(userId, userEmail);
    }
}

async function persistAccount(account: TradingAccountRecord): Promise<void> {
    const normalized = normalizeAccount(account);

    try {
        await connectToDatabase();
        await syncAccountRecords(buildAccountFilter(normalized.userId, normalized.userEmail), normalized);
    } catch (error) {
        console.warn('[Trading] Failed to persist account, storing in memory:', error);
        fallbackStore.accounts.set(normalized.userId, cloneAccount(normalized));
    }
}

const getHoldingValue = (holding: TradingHoldingRecord, currentPrice: number) => roundMoney(holding.quantity * currentPrice);

function buildPortfolioResponse(account: TradingAccountRecord): TradingPortfolioResponse {
    const normalized = normalizeAccount(account);
    const holdings = normalized.holdings.map((holding) => {
        const quote = getMockQuote(holding.symbol, holding.assetName);
        const marketValue = getHoldingValue(holding, quote.price);
        const costBasis = roundMoney(holding.quantity * holding.averageBuyPrice);
        const unrealizedPnL = roundMoney(marketValue - costBasis);
        const unrealizedPnLPercent = costBasis > 0 ? roundMoney((unrealizedPnL / costBasis) * 100) : 0;

        return {
            symbol: holding.symbol,
            assetName: holding.assetName,
            quantity: holding.quantity,
            averageBuyPrice: roundMoney(holding.averageBuyPrice),
            currentPrice: quote.price,
            marketValue,
            totalValue: marketValue,
            unrealizedPnL,
            unrealizedPnLPercent,
        };
    });

    const holdingsValue = roundMoney(holdings.reduce((sum, holding) => sum + holding.marketValue, 0));
    const investedAmount = roundMoney(holdings.reduce((sum, holding) => sum + holding.quantity * holding.averageBuyPrice, 0));
    const realizedPnL = roundMoney(
        normalized.transactions.reduce((sum, transaction) => sum + (transaction.realizedPnL || 0), 0)
    );
    const unrealizedPnL = roundMoney(holdings.reduce((sum, holding) => sum + holding.unrealizedPnL, 0));
    const totalPortfolioValue = roundMoney(normalized.availableBalance + holdingsValue);
    const totalPnL = roundMoney(totalPortfolioValue - normalized.initialBalance);
    const totalPnLPercent = normalized.initialBalance > 0 ? roundMoney((totalPnL / normalized.initialBalance) * 100) : 0;
    const allocation: TradingAllocationItem[] = holdingsValue > 0
        ? holdings
            .map((holding) => ({
                symbol: holding.symbol,
                assetName: holding.assetName,
                value: holding.marketValue,
                percentage: roundMoney((holding.marketValue / holdingsValue) * 100),
            }))
            .sort((a, b) => b.value - a.value)
        : [];

    return {
        userId: normalized.userId,
        userEmail: normalized.userEmail,
        summary: {
            initialBalance: normalized.initialBalance,
            availableBalance: normalized.availableBalance,
            investedAmount,
            holdingsValue,
            totalPortfolioValue,
            totalPnL,
            totalPnLPercent,
            unrealizedPnL,
            realizedPnL,
            holdingsCount: holdings.length,
        },
        holdings,
        allocation,
        updatedAt: normalized.updatedAt,
    };
}

const mapTransaction = (transaction: TradingTransactionRecord): TradingTransaction => ({
    transactionId: transaction.transactionId,
    symbol: transaction.symbol,
    assetName: transaction.assetName,
    side: transaction.side,
    quantity: transaction.quantity,
    price: roundMoney(transaction.price),
    totalAmount: roundMoney(transaction.totalAmount),
    status: transaction.status,
    executedAt: toIsoString(transaction.executedAt),
    realizedPnL: isFiniteNumber(transaction.realizedPnL) ? roundMoney(Number(transaction.realizedPnL)) : undefined,
    balanceAfter: roundMoney(transaction.balanceAfter),
    holdingsAfter: Math.max(0, Math.floor(transaction.holdingsAfter)),
    note: transaction.note,
});

function applyTradingOrder(account: TradingAccountRecord, request: TradingOrderRequest): { account: TradingAccountRecord; transaction: TradingTransaction } {
    const symbol = String(request.symbol || '').trim().toUpperCase();
    const assetName = String(request.assetName || symbol || '').trim() || symbol;
    const side = request.side === 'sell' ? 'sell' : 'buy';
    const quantity = Math.max(0, Math.floor(Number(request.quantity) || 0));

    if (!symbol) {
        throw new TradingError('Symbol is required');
    }

    if (!quantity) {
        throw new TradingError('Quantity must be greater than zero');
    }

    const quote = getMockQuote(symbol, assetName);
    const orderValue = roundMoney(quantity * quote.price);
    const holdings = [...account.holdings];
    const existingHoldingIndex = holdings.findIndex((holding) => holding.symbol === symbol);
    const existingHolding = existingHoldingIndex >= 0 ? holdings[existingHoldingIndex] : null;
    let availableBalance = roundMoney(account.availableBalance);
    let realizedPnL = 0;

    if (side === 'buy') {
        if (availableBalance < orderValue) {
            throw new TradingError('Insufficient virtual balance for this buy order');
        }

        const nextHoldingQuantity = (existingHolding?.quantity || 0) + quantity;
        const nextAveragePrice = existingHolding
            ? roundMoney(((existingHolding.quantity * existingHolding.averageBuyPrice) + orderValue) / nextHoldingQuantity)
            : quote.price;

        if (existingHolding) {
            holdings[existingHoldingIndex] = {
                ...existingHolding,
                assetName,
                quantity: nextHoldingQuantity,
                averageBuyPrice: nextAveragePrice,
            };
        } else {
            holdings.push({
                symbol,
                assetName,
                quantity,
                averageBuyPrice: quote.price,
            });
        }

        availableBalance = roundMoney(availableBalance - orderValue);
    } else {
        if (!existingHolding || existingHolding.quantity < quantity) {
            throw new TradingError('You cannot sell more shares than you currently own');
        }

        realizedPnL = roundMoney((quote.price - existingHolding.averageBuyPrice) * quantity);
        availableBalance = roundMoney(availableBalance + orderValue);

        const remainingQuantity = existingHolding.quantity - quantity;

        if (remainingQuantity > 0) {
            holdings[existingHoldingIndex] = {
                ...existingHolding,
                assetName,
                quantity: remainingQuantity,
                averageBuyPrice: existingHolding.averageBuyPrice,
            };
        } else {
            holdings.splice(existingHoldingIndex, 1);
        }
    }

    const nextTransaction: TradingTransaction = {
        transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        symbol,
        assetName,
        side,
        quantity,
        price: quote.price,
        totalAmount: orderValue,
        status: 'filled',
        executedAt: nowIso(),
        realizedPnL: side === 'sell' ? realizedPnL : undefined,
        balanceAfter: availableBalance,
        holdingsAfter: holdings.reduce((sum, holding) => sum + holding.quantity, 0),
        note: side === 'buy' ? 'Buy order filled successfully' : 'Sell order filled successfully',
    };

    const nextAccount: TradingAccountRecord = normalizeAccount({
        ...account,
        availableBalance,
        holdings,
        transactions: [...account.transactions, nextTransaction],
        updatedAt: nowIso(),
    });

    return {
        account: nextAccount,
        transaction: nextTransaction,
    };
}

export async function getTradingPortfolio(userId: string, userEmail: string): Promise<TradingPortfolioResponse> {
    const account = await loadAccount(userId, userEmail);
    return buildPortfolioResponse(account);
}

export async function executeTradingOrder(userId: string, userEmail: string, request: TradingOrderRequest): Promise<TradingOrderResponse> {
    const account = await loadAccount(userId, userEmail);
    const result = applyTradingOrder(account, request);

    await persistAccount(result.account);

    return {
        success: true,
        message: result.transaction.side === 'buy'
            ? `Bought ${result.transaction.quantity} share${result.transaction.quantity === 1 ? '' : 's'} of ${result.transaction.assetName}`
            : `Sold ${result.transaction.quantity} share${result.transaction.quantity === 1 ? '' : 's'} of ${result.transaction.assetName}`,
        portfolio: buildPortfolioResponse(result.account),
        transaction: result.transaction,
    };
}

export async function listTradingTransactions(
    userId: string,
    userEmail: string,
    options: {
        search?: string;
        type?: 'all' | 'buy' | 'sell';
        sortBy?: 'executedAt' | 'side';
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    } = {}
): Promise<TradingTransactionsResponse> {
    const account = await loadAccount(userId, userEmail);
    const search = String(options.search || '').trim().toLowerCase();
    const type = options.type || 'all';
    const sortBy = options.sortBy || 'executedAt';
    const sortOrder = options.sortOrder || 'desc';
    const page = Math.max(1, Math.floor(Number(options.page) || 1));
    const limit = Math.max(1, Math.floor(Number(options.limit) || DEFAULT_LIMIT));

    const filtered = account.transactions.filter((transaction) => {
        if (type !== 'all' && transaction.side !== type) {
            return false;
        }

        if (!search) {
            return true;
        }

        const haystack = [
            transaction.transactionId,
            transaction.symbol,
            transaction.assetName,
            transaction.side,
            transaction.status,
            transaction.note || '',
        ].join(' ').toLowerCase();

        return haystack.includes(search);
    });

    const sorted = [...filtered].sort((left, right) => {
        let comparison = 0;

        if (sortBy === 'side') {
            comparison = left.side.localeCompare(right.side);
            if (comparison === 0) {
                comparison = new Date(left.executedAt).getTime() - new Date(right.executedAt).getTime();
            }
        } else {
            comparison = new Date(left.executedAt).getTime() - new Date(right.executedAt).getTime();
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;
    const items = sorted.slice(startIndex, startIndex + limit).map(mapTransaction);

    return {
        items,
        total,
        page: safePage,
        limit,
        totalPages,
    };
}

export function getPortfolioSummaryForEmptyState(): TradingPortfolioSummary {
    return {
        initialBalance: DEFAULT_INITIAL_BALANCE,
        availableBalance: DEFAULT_INITIAL_BALANCE,
        investedAmount: 0,
        holdingsValue: 0,
        totalPortfolioValue: DEFAULT_INITIAL_BALANCE,
        totalPnL: 0,
        totalPnLPercent: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
        holdingsCount: 0,
    };
}