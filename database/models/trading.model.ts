import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface TradingHoldingItem {
    symbol: string;
    assetName: string;
    quantity: number;
    averageBuyPrice: number;
}

export interface TradingTransactionItem {
    transactionId: string;
    symbol: string;
    assetName: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    totalAmount: number;
    status: 'filled' | 'rejected';
    executedAt: Date;
    realizedPnL?: number;
    balanceAfter: number;
    holdingsAfter: number;
    note?: string;
}

export interface TradingAccountItem extends Document {
    userId: string;
    userEmail: string;
    initialBalance: number;
    availableBalance: number;
    holdings: TradingHoldingItem[];
    transactions: TradingTransactionItem[];
    createdAt: Date;
    updatedAt: Date;
}

const TradingHoldingSchema = new Schema<TradingHoldingItem>(
    {
        symbol: { type: String, required: true, uppercase: true, trim: true },
        assetName: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 0 },
        averageBuyPrice: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const TradingTransactionSchema = new Schema<TradingTransactionItem>(
    {
        transactionId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        assetName: { type: String, required: true, trim: true },
        side: { type: String, required: true, enum: ['buy', 'sell'] },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        status: { type: String, required: true, enum: ['filled', 'rejected'] },
        executedAt: { type: Date, required: true },
        realizedPnL: { type: Number },
        balanceAfter: { type: Number, required: true, min: 0 },
        holdingsAfter: { type: Number, required: true, min: 0 },
        note: { type: String },
    },
    { _id: false }
);

const TradingAccountSchema = new Schema<TradingAccountItem>(
    {
        userId: { type: String, required: true, unique: true, index: true },
        userEmail: { type: String, required: true, index: true },
        initialBalance: { type: Number, required: true, default: 100000 },
        availableBalance: { type: Number, required: true, default: 100000, min: 0 },
        holdings: { type: [TradingHoldingSchema], default: [] },
        transactions: { type: [TradingTransactionSchema], default: [] },
    },
    {
        timestamps: true,
        collection: 'trading_accounts',
    }
);

export const TradingAccount: Model<TradingAccountItem> =
    (models?.TradingAccount as Model<TradingAccountItem>) || model<TradingAccountItem>('TradingAccount', TradingAccountSchema);