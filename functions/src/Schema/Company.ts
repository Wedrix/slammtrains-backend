import * as Schema from 'zod';

import { Image } from './Image';
import { Address } from './Address';
import { Subscription } from './Subscription';

export const HR = Schema.object({
    email: Schema.string(),
    name: Schema.string(),
    uid: Schema.string(),
});

export const Company = Schema.object({
    id: Schema.string(),
    address: Address,
    hr: HR,
    email: Schema.string(),
    emailId: Schema.string(),
    employeesTotalCount: Schema.number(),
    industry: Schema.string().nullable(),
    logo: Image,
    name: Schema.string(),
    __name: Schema.string(),
    size: Schema.string(),
    phoneNumber: Schema.string(),
    postalAddress: Schema.string().nullable(),
    plan: Schema.unknown(),
    subscription: Subscription.nullable(),
    revenue: Schema.any(),
    blockedAt: Schema.number().nullable(),
    accessToCoursesBlockedAt: Schema.number().nullable(),
    createdAt: Schema.number(),
});

export type HR = Schema.infer<typeof HR>;
export type Company = Schema.infer<typeof Company>;