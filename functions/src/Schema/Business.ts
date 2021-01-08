import * as Schema from 'zod';

export const Business = Schema.object({
    name: Schema.string(),
    legalName: Schema.string(),
    supportEmail: Schema.string(),
});

export type Business = Schema.infer<typeof Business>;