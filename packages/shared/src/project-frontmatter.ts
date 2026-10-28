import { parse } from 'yaml';
import { z } from 'zod';

export const projectFrontmatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  /** ISO calendar date, e.g. 2026-10-27. */
  date: z.iso.date(),
  tags: z.array(z.string().min(1)).default([]),
  draft: z.boolean().default(false),
});

export type ProjectFrontmatter = z.output<typeof projectFrontmatterSchema>;

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Reads and validates the leading YAML block of a write-up's raw MDX source. */
export const parseProjectFrontmatter = (source: string): ProjectFrontmatter => {
  const block = FRONTMATTER_BLOCK.exec(source)?.[1];
  if (block === undefined) {
    throw new Error('Missing frontmatter block');
  }
  const result = projectFrontmatterSchema.safeParse(parse(block));
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid frontmatter: ${issues}`);
  }
  return result.data;
};
