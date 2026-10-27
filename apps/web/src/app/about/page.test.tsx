import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AboutPage from './page';

describe('AboutPage', () => {
  it('renders the About heading', () => {
    expect(renderToStaticMarkup(<AboutPage />)).toMatch(/<h1[^>]*>About<\/h1>/);
  });
});
