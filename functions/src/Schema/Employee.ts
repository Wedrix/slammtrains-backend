import * as Schema from 'zod';

import { Course } from './Course';
import { Company } from './Company';
import { resolveCompany, resolveCourse } from '../Helpers/ResolveDocuments';

export const Employee = Schema.object({
    name: Schema.string(),
    email: Schema.string(),
    uid: Schema.string(),
    enrolledCourses: Schema.array(
        Schema.transformer(Schema.any(), Course, async (course) => {
            if (!Course.check(course)) {
                return resolveCourse(course);
            }

            return course;
        })
    ),
    company: Schema.transformer(Schema.any(), Company, async (company) => {
        if (!Company.check(company)) {
            return resolveCompany(company);
        }

        return company;
    }),
    createdAt: Schema.number(),
});

export type Employee = Schema.infer<typeof Employee>;