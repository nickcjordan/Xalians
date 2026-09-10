// Schema for encyclopedia.json: the public canon catalog rendered at /encyclopedia,
// seeded from the glossary and expanded with species/place/faction entries. The
// `categories` list is the closed set entry.category must belong to; enforced by a
// cross-field check rather than an enum literal, since the categories themselves are
// data in the file, not hardcoded here.
import { z } from 'zod';
import { ElementKeySchema } from './registries.ts';

const PronunciationSchema = z.object({
  respelling: z.string().min(1),
  ipa: z.string().min(1),
});

const EncyclopediaEntrySchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  definition: z.string().min(1),
  related: z.array(z.string().min(1)).optional(),
  pronunciation: PronunciationSchema.optional(),
  aliases: z.array(z.string().min(1)).optional(),
  element: ElementKeySchema.optional(),
});

export const EncyclopediaSchema = z
  .object({
    masthead: z.string().min(1),
    version: z.string().min(1),
    note: z.string(),
    categories: z.array(z.string().min(1)).min(1),
    entries: z.array(EncyclopediaEntrySchema).min(1),
  })
  .check((ctx) => {
    const categories = new Set(ctx.value.categories);
    ctx.value.entries.forEach((entry, index) => {
      if (!categories.has(entry.category)) {
        ctx.issues.push({
          code: 'custom',
          message: `entry "${entry.key}" has category "${entry.category}", which is not in the categories list`,
          input: ctx.value,
          path: ['entries', index, 'category'],
        });
      }
    });
  });

export type EncyclopediaEntry = z.infer<typeof EncyclopediaEntrySchema>;
export type Encyclopedia = z.infer<typeof EncyclopediaSchema>;
