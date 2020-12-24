import * as Schema from 'zod';

export const CourseRequest = Schema.object({
    id: Schema.string(),
    name: Schema.string(),
    details: Schema.string(),
    company: Schema.unknown(),
    createdAt: Schema.number(),
    __name: Schema.string(),
});

export type CourseRequest = Schema.infer<typeof CourseRequest>;