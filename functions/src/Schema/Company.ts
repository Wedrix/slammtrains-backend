import * as Schema from 'zod';
import * as admin from 'firebase-admin';

import { Image } from './Image';
import { Address } from './Address';
import { Subscription } from './Subscription';
//import { PlanReference } from './Plan';

import { resolveCompany } from '../Helpers/ResolveDocuments';

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
    plan: Schema.any(),//PlanReference,
    subscription: Subscription.nullable(),
    accessBlockedAt: Schema.number().nullable(),
    createdAt: Schema.number(),
});

export const CompanyReference = Schema.unknown()
                                    .transform(Company.nullable(), async (company) => {
                                        if (!Company.nullable().check(company)) {
                                            if ((typeof company === 'string') 
                                                || (company instanceof admin.firestore.DocumentReference)) {
                                                    return resolveCompany(company);
                                            }

                                            return null;
                                        }

                                        return company;
                                    });

export type HR = Schema.infer<typeof HR>;
export type Company = Schema.infer<typeof Company>;
export type CompanyReference = Schema.infer<typeof CompanyReference>;