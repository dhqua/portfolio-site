import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';

// The loader imports .mdx, which Vitest can't compile; Next's build covers the real path.
vi.mock('@/lib/projects', () => ({
  getAllProjects: () =>
    Promise.resolve([
      {
        slug: 'demo',
        title: 'Demo project',
        summary: 'S',
        date: '2026-10-27',
        tags: [],
        draft: false,
      },
    ]),
}));

describe('HomePage', () => {
  it('renders the intro heading, a link to Projects, and the latest projects', async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toMatch(/<h1[^>]*>Hey, I(&#x27;|')m Qua\.<\/h1>/);
    expect(html).toMatch(/<a[^>]*href="\/projects\/?"/);
    expect(html).toMatch(/href="\/projects\/demo\/?"/);
    expect(html).toContain('Demo project');
  });
});
