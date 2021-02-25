import * as Schema from 'zod';

export const Review = Schema.object({
    employeeInitials: Schema.string(),
    employee: Schema.unknown(),
    body: Schema.string(),
    createdAt: Schema.number(),
    rating: Schema.number(),
});

export type Review = Schema.infer<typeof Review>;