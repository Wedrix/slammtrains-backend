import * as Schema from 'zod';

import { CompanyReference } from './Company';

export const Employee = Schema.object({
    id: Schema.string(),
    name: Schema.string(),
    __name: Schema.string(),
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
    company: CompanyReference,
    createdAt: Schema.number(),
});

export type Employee = Schema.infer<typeof Employee>;