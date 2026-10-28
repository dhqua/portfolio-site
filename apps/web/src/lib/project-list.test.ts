import { describe, expect, it } from 'vitest';
import { publishedProjects, type ProjectSummary } from './project-list.ts';

const project = (slug: string, date: string, draft = false): ProjectSummary => ({
  slug,
  title: slug,
  summary: 's',
  date,
  tags: [],
  draft,
});

describe('publishedProjects', () => {
  it('sorts newest first', () => {
    const result = publishedProjects([
      project('a', '2026-01-01'),
      project('c', '2026-03-01'),
      project('b', '2026-02-01'),
    ]);
    expect(result.map((p) => p.slug)).toEqual(['c', 'b', 'a']);
  });

  it('drops drafts', () => {
    const result = publishedProjects([
      project('a', '2026-01-01', true),
      project('b', '2026-02-01'),
    ]);
    expect(result.map((p) => p.slug)).toEqual(['b']);
  });

  it('does not mutate its input', () => {
    const input = [project('a', '2026-01-01'), project('b', '2026-02-01')];
    publishedProjects(input);
    expect(input.map((p) => p.slug)).toEqual(['a', 'b']);
  });
});
