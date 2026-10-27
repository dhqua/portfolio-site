import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the intro heading and a link to Projects', () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toMatch(/<h1[^>]*>Hi, I(&#x27;|')m Qua\.<\/h1>/);
    expect(html).toMatch(/<a[^>]*href="\/projects\/?"/);
  });
});
