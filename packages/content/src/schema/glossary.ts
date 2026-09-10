// Schema for glossary.json: the 67-term canon glossary (word/definition pairs) that
// seeds the Encyclopedia.
import { z } from 'zod';

const GlossaryEntrySchema = z.object({
  word: z.string().min(1),
  definition: z.string().min(1),
});

export const GlossarySchema = z.array(GlossaryEntrySchema);

export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
