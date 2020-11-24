import * as Schema from 'zod';

import { Plan } from './Plan';
import { Image } from './Image';
import { Address } from './Address';
import { Course } from './Course';

export const PlanData = Plan.omit({ id: true, courses: true, createdAt: true })
                            .merge(
                                Schema.object({
                                    courses: Schema.array(Schema.string()),
                                })
                            );
                            
export const CourseData = Course.omit({ id: true, createdAt: true });
export const DraftCourseData = CourseData.partial();

export const HRData = Schema.object({
    email: Schema.string(),
    password: Schema.string(),
    displayName: Schema.string(),
});

export const CompanyData = Schema.object({
    logo: Image,
    plan: Schema.string(),
    name: Schema.string(),
    email: Schema.string(),
    phoneNumber: Schema.string(),
    size: Schema.string(),
    industry: Schema.string().nullable(),
    address: Address,
    postalAddress: Schema.string().nullable(),
});

export const EmployeeData = Schema.object({
    name: Schema.string(),
    email: Schema.string(),
});

export const CompletedLessonData = Schema.object({
    courseId: Schema.string(), 
    moduleName: Schema.string(),
    lessonTitle: Schema.string(), 
});

export const TestScoreData = Schema.object({
    courseId: Schema.string(), 
    moduleName: Schema.string(),
    testScore: Schema.number(), 
});

export const TransactionsPaginationData = Schema.object({
    companyId: Schema.string().optional(),
    perPage: Schema.number(),
    page: Schema.number(),
});

export const RequestedCourseData = Schema.object({
    name: Schema.string(),
    description: Schema.string(),
});

export type EmployeeData = Schema.infer<typeof EmployeeData>;
export type PlanData = Schema.infer<typeof PlanData>;
export type CompanyData = Schema.infer<typeof CompanyData>;
export type HRData = Schema.infer<typeof HRData>;
export type CourseData = Schema.infer<typeof CourseData>;
export type DraftCourseData = Schema.infer<typeof DraftCourseData>;
export type CompletedLessonData = Schema.infer<typeof CompletedLessonData>;
export type TestScoreData = Schema.infer<typeof TestScoreData>;
export type TransactionsPaginationData = Schema.infer<typeof TransactionsPaginationData>;
export type RequestedCourseData = Schema.infer<typeof RequestedCourseData>;