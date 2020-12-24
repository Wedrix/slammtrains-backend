import * as Schema from 'zod';

export const BillingInterval = Schema.enum([
    'hourly',
    'daily',
    'weekly',
    'monthly',
    'biannually',
    'annually',
]);

export const Currency = Schema.enum([
    'GHS',
    'NGN',
]);

export const Channel = Schema.enum([
    'card',
    'bank',
    'ussd',
    'qr',
    'mobile_money',
    'bank_transfer',
]);

export const Plan = Schema.object({
    name: Schema.string(),
    plan_code: Schema.string(),
    amount: Schema.number(),
    interval: BillingInterval,
    currency: Currency,
})
.passthrough();

export const Customer = Schema.object({
    email: Schema.string(),
    customer_code: Schema.string(),
})
.passthrough();

export const Subscription = Schema.object({
    status: Schema.string(),
    subscription_code: Schema.string(),
    amount: Schema.number(),
    next_payment_date: Schema.string(),
    open_invoice: Schema.any(),
    plan: Plan,
    customer: Customer,
    created_at: Schema.string(),
})
.passthrough();

export const Transaction = Schema.object({ 
    id: Schema.number(),
    reference: Schema.string(),
    amount: Schema.number(),
    paid_at: Schema.string(),
    created_at: Schema.string(),
    channel: Channel,
    currency: Currency,
    metadata: Schema.any(),
    fees: Schema.any(),
    customer: Customer,
})
.passthrough();

export type Plan = Schema.infer<typeof Plan>;
export type Subscription = Schema.infer<typeof Subscription>;
export type Transaction = Schema.infer<typeof Transaction>;
export type Customer = Schema.infer<typeof Customer>;
export type Channel = Schema.infer<typeof Channel>;
export type Currency = Schema.infer<typeof Currency>;
export type BillingInterval = Schema.infer<typeof BillingInterval>;