import * as Schema from 'zod';

import * as Paystack from './Paystack';

export const Subscription = Schema.object({
    createdAt: Schema.number(),
    expiresAt: Schema.number(),
    expiryReminderNotificationSentAt: Schema.number().nullable(),
    transaction: Paystack.Transaction,
});

export type Subscription = Schema.infer<typeof Subscription>;