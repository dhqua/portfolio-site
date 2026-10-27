import { describe, expect, it } from 'vitest';
import { parseProjectFrontmatter, projectFrontmatterSchema } from './project-frontmatter.ts';

const valid = { title: 'T', summary: 'S', date: '2026-10-27' };

describe('projectFrontmatterSchema', () => {
  it('applies defaults for tags and draft', () => {
    expect(projectFrontmatterSchema.parse(valid)).toEqual({ ...valid, tags: [], draft: false });
  });

  it('rejects a missing title', () => {
    expect(projectFrontmatterSchema.safeParse({ summary: 'S', date: '2026-10-27' }).success).toBe(
      false,
    );
  });

  it.each(['10/27/2026', '2026-13-01', 'yesterday'])('rejects the bad date %s', (date) => {
    expect(projectFrontmatterSchema.safeParse({ ...valid, date }).success).toBe(false);
  });
});

describe('parseProjectFrontmatter', () => {
  it('parses the leading YAML block', () => {
    const source = '---\ntitle: T\nsummary: S\ndate: 2026-10-27\ntags: [aws]\n---\n\n# Body\n';
    expect(parseProjectFrontmatter(source)).toEqual({ ...valid, tags: ['aws'], draft: false });
  });

  it('throws when there is no frontmatter block', () => {
    expect(() => parseProjectFrontmatter('# Just a body')).toThrow('Missing frontmatter');
  });

  it('names the failing keys in the error', () => {
    expect(() => parseProjectFrontmatter('---\nsummary: S\ndate: 2026-10-27\n---\n')).toThrow(
      /title/,
    );
  });
});
