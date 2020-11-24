import * as Schema from 'zod';

export const BillingInterval = Schema.enum([
    'monthly',
    'biannually',
    'annually',
    'biennially',
]);

export const BillingCurrency = Schema.enum([
    'GHS',
    'NGN',
]);

export const BillingIntervals = {
    monthly: 30,
    biannually: 180,
    annually: 360,
    biennially: 720,
};

export const Billing = Schema.object({
    price: Schema.number(),
    interval: BillingInterval,
    currency: BillingCurrency,
});

export type Billing = Schema.infer<typeof Billing>;
export type BillingInterval = 'monthly' | 'biannually' | 'annually' | 'biennially';
export type BillingCurrency = 'GHS' | 'NGN';