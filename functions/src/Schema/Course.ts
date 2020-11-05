import * as Schema from 'zod';

import { Image } from './Image';
import { Video } from './Video';

export const Lesson = Schema.object({
    title: Schema.string(),
    durationInMinutes: Schema.number(),
    canBePreviewed: Schema.boolean(),
    contentType: Schema.enum([
        'video',
        'html',
    ]),
    video: Video.nullable(),
    html: Schema.string().nullable(),
});

export const Question = Schema.object({
    question: Schema.string(),
    options: Schema.array(
        Schema.string()
    ),
    answers: Schema.array(
        Schema.string()
    ),
    explanation: Schema.string(),
    durationInSeconds: Schema.number(),
});

export const Module = Schema.object({
    name: Schema.string(),
    lessons: Schema.array(Lesson),
    test: Schema.object({
        questions: Schema.array(Question),
    }),
});

export const Course = Schema.object({
    id: Schema.string(),
    name: Schema.string(),
    description: Schema.string(),
    overview: Schema.string(),
    thumbnail: Image,
    modules: Schema.array(Module),
    createdAt: Schema.number(),
});

export type Lesson = Schema.infer<typeof Lesson>;
export type Question = Schema.infer<typeof Question>;
export type Module = Schema.infer<typeof Module>;
export type Course = Schema.infer<typeof Course>;