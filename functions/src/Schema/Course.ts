import * as Schema from 'zod';

import { Image } from './Image';
import { Video } from './Video';

export const Lesson = Schema.object({
    title: Schema.string(),
    durationInSeconds: Schema.number(),
    contentType: Schema.enum([
        'video',
        'html',
        'questions',
    ]),
    content: Schema.unknown(),
});

export const Module = Schema.object({
    name: Schema.string(),
    lessons: Schema.array(Lesson),
    canBePreviewed: Schema.boolean(),
});

export const Course = Schema.object({
    id: Schema.string(),
    name: Schema.string(),
    __name: Schema.string(),
    description: Schema.string(),
    overview: Schema.string(),
    thumbnail: Image,
    modules: Schema.array(Module),
    createdAt: Schema.number(),
    ratingsSumTotal: Schema.number(),
    reviewsSumTotal: Schema.number(),
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

export const LessonContent = Schema.object({
    video: Video,
    html: Schema.string(),
    questions: Schema.array(Question),
})
.partial();

export type Course = Schema.infer<typeof Course>;
export type LessonContent = Schema.infer<typeof LessonContent>;