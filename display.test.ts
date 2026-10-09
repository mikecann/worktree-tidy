import { describe, expect, it } from 'bun:test';

import { printable } from './display';

describe('printable', () => {
  it('leaves ordinary paths alone', () => {
    expect(printable('apps/web/.env.local')).toBe('apps/web/.env.local');
    expect(printable(String.raw`C:\dev\repo\wt 1`)).toBe(String.raw`C:\dev\repo\wt 1`);
  });

  it('escapes terminal control characters so a file name cannot rewrite the screen', () => {
    expect(printable('\u001b[2J\u001b[H.env')).toBe(String.raw`\x1b[2J\x1b[H.env`);
    expect(printable('a\rb\nc\td\u007f\u009b.env')).toBe(String.raw`a\x0db\x0ac\x09d\x7f\x9b.env`);
  });

  it('escapes bidi and zero-width marks that could reorder or hide text', () => {
    expect(printable('wt-\u202egnp.env')).toBe(String.raw`wt-\u202egnp.env`);
    expect(printable('a\u200bb\u2066c\u2069\u061c\ufeff')).toBe(String.raw`a\u200bb\u2066c\u2069\u061c\ufeff`);
  });
});
