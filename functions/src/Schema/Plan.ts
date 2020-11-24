import * as Schema from 'zod';
import * as admin from 'firebase-admin';

import { Billing } from './Billing';

import { resolvePlan } from '../Helpers/ResolveDocuments';

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

export const PlanReference = Schema.unknown()
                                    .transform(Plan.nullable(), async (plan) => {
                                        if (!Plan.nullable().check(plan)) {
                                            if ((typeof plan === 'string') 
                                                || (plan instanceof admin.firestore.DocumentReference)) {
                                                    return resolvePlan(plan);
                                            }

                                            return null;
                                        }

                                        return plan;
                                    });

export type Plan = Schema.infer<typeof Plan>;
export type PlanReference = Schema.infer<typeof PlanReference>;