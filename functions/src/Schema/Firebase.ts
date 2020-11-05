import * as Schema from 'zod';

export const Timestamp = Schema.transformer(Schema.any(), Schema.date(), async (timestamp) => {
    return new Date(timestamp.toMillis());
});