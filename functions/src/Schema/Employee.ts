import * as Schema from 'zod';
import * as admin from 'firebase-admin';

import { Company } from './Company';
import { resolveCompany } from '../Helpers/ResolveDocuments';

export const Employee = Schema.object({
    id: Schema.string(),
    name: Schema.string(),
    email: Schema.string(),
    uid: Schema.string(),
    enrolledCourses: Schema.record(
        Schema.record(
            Schema.object({
                completedLessons: Schema.array(
                    Schema.string()
                ),
                testScoreHistory: Schema.array(
                    Schema.number()
                ),
            })
        )
    ),
    company: Schema.unknown()
                    .transform(Company.nullable(), async (company) => {
                        if (!Company.nullable().check(company)) {
                            if ((typeof company === 'string') 
                                || (company instanceof admin.firestore.DocumentReference)) {
                                    return resolveCompany(company);
                            }

                            return null;
                        }

                        return company;
                    }),
    createdAt: Schema.number(),
});

export type Employee = Schema.infer<typeof Employee>;