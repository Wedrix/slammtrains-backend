import * as Schema from 'zod';

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
            })
        )
    ),
    company: Schema.unknown(),
    createdAt: Schema.number(),
});

export type Employee = Schema.infer<typeof Employee>;