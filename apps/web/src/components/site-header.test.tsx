import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NAV_LINKS, SiteHeader } from './site-header';

describe('SiteHeader', () => {
  it('links to every top-level page', () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    for (const { href, label } of NAV_LINKS) {
      expect(html).toMatch(new RegExp(`href="${href.replace(/\/$/, '')}/?"[^>]*>${label}<`));
    }
  });
});
