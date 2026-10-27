import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseProjectFrontmatter } from '@portfolio/shared';
import { describe, expect, it } from 'vitest';

const contentDir = fileURLToPath(new URL('../../../../content/projects/', import.meta.url));
const files = readdirSync(contentDir).filter((file) => file.endsWith('.mdx'));

describe('content/projects', () => {
  it('has at least one write-up', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has valid frontmatter', (file) => {
    expect(() => parseProjectFrontmatter(readFileSync(contentDir + file, 'utf8'))).not.toThrow();
  });
});
