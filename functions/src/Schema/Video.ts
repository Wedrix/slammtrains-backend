import * as Schema from 'zod';

export const Video = Schema.object({
    fileName: Schema.string(),
    fullPath: Schema.string(),
    src: Schema.string(),
    thumbnail: Schema.object({
        fileName: Schema.string(),
        fullPath: Schema.string(),
        src: Schema.string(),
    }),
});

export type Video = Schema.infer<typeof Video>;