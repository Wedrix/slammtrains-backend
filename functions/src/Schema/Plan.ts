import * as Schema from 'zod';

import { Billing } from './Billing';

export const Plan = Schema.object({
    id: Schema.string(),
    name: Schema.string(), 
    courses: Schema.array(
        Schema.unknown()
    ),
    description: Schema.string(),
    licensedNumberOfEmployees: Schema.number(),
    billing: Billing.nullable(),
    createdAt: Schema.number(),
});

export type Plan = Schema.infer<typeof Plan>;