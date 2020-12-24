import * as Schema from 'zod';

import { Image } from './Image';
import { Address } from './Address';
import { Video } from './Video';
import { Billing } from './Billing';

export const PlanData = Schema.object({
    name: Schema.string(), 
    courseIds: Schema.array(
        Schema.string()
    ),
    description: Schema.string(),
    licensedNumberOfEmployees: Schema.number(),
    billing: Billing.nullable(),
});

export const CourseData = Schema.object({
    name: Schema.string(),
    description: Schema.string(),
    overview: Schema.string(),
    thumbnail: Image,
    modules: Schema.array(
        Schema.object({
            name: Schema.string(),
            lessons: Schema.array(
                Schema.object({
                    title: Schema.string(),
                    durationInSeconds: Schema.number(),
                    contentType: Schema.enum([
                        'video',
                        'html',
                        'questions',
                    ]),
                    content: Schema.object({
                        video: Video,
                        html: Schema.string(),
                        questions: Schema.array(
                            Schema.object({
                                question: Schema.string(),
                                options: Schema.array(
                                    Schema.string()
                                ),
                                answers: Schema.array(
                                    Schema.string()
                                ),
                                explanation: Schema.string(),
                                durationInSeconds: Schema.number(),
                            })
                        ),
                    })
                    .partial(),
                })
            ),
            canBePreviewed: Schema.boolean(),
        })
    ),
});

export const CourseDraftData = CourseData.partial();

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

export const TransactionsPaginationData = Schema.object({
    companyId: Schema.string().optional(),
    perPage: Schema.number(),
    page: Schema.number(),
});

export const CourseRequestData = Schema.object({
    courseName: Schema.string(),
    details: Schema.string(),
});

export const EmailData = Schema.object({
    subject: Schema.string(),
    body: Schema.string(),
});

export const CustomPlanRequestData = Schema.object({
    details: Schema.string(),
    essentialCoursesIds: Schema.array(Schema.string()),
});

export type EmployeeData = Schema.infer<typeof EmployeeData>;
export type PlanData = Schema.infer<typeof PlanData>;
export type CompanyData = Schema.infer<typeof CompanyData>;
export type HRData = Schema.infer<typeof HRData>;
export type CourseData = Schema.infer<typeof CourseData>;
export type CourseDraftData = Schema.infer<typeof CourseDraftData>;
export type CompletedLessonData = Schema.infer<typeof CompletedLessonData>;
export type TransactionsPaginationData = Schema.infer<typeof TransactionsPaginationData>;
export type CourseRequestData = Schema.infer<typeof CourseRequestData>;
export type EmailData = Schema.infer<typeof EmailData>;
export type CustomPlanRequestData = Schema.infer<typeof CustomPlanRequestData>;