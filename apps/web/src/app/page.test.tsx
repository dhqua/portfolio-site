import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the Hello heading', () => {
    expect(renderToStaticMarkup(<HomePage />)).toMatch(/<h1[^>]*>Hello<\/h1>/);
  });
});
