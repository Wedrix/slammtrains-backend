import * as Schema from 'zod';

export const Image = Schema.object({
    fileName: Schema.string(),
    fullPath: Schema.string(),
    src: Schema.string(),
});

export type Image = Schema.infer<typeof Image>;