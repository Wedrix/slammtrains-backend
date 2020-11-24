import * as Schema from 'zod';

import { CompanyReference } from './Company';

export const RequestedCourse = Schema.object({
    id: Schema.string(),
    name: Schema.string(),
    description: Schema.string(),
    company: CompanyReference,
    createdAt: Schema.number(),
    __name: Schema.string(),
});

export type RequestedCourse = Schema.infer<typeof RequestedCourse>;