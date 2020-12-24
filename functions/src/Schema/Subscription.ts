import * as Schema from 'zod';

export const Subscription = Schema.object({
    createdAt: Schema.number(),
    expiresAt: Schema.number(),
    expiryReminderNotificationSentAt: Schema.number().nullable(),
});

export type Subscription = Schema.infer<typeof Subscription>;