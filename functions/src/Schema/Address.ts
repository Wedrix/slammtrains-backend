import * as Schema from 'zod';

export const Address = Schema.object({
    addressLine1: Schema.string(),
    addressLine2: Schema.string(),
    city: Schema.string(),
    country: Schema.string(),
    region: Schema.string(),
});

export type Address = Schema.infer<typeof Address>;