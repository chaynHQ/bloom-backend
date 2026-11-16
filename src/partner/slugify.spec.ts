import { slugify } from './slugify';

describe('slugify', () => {
  it.each([
    ['Bumble', 'bumble'],
    ['Badoo', 'badoo'],
    ['Fruitz', 'fruitz'],
    ['Bumble For Friends', 'bumble-for-friends'],
    ['  Bumble  For Friends! ', 'bumble-for-friends'],
    ['B_mble & Co.', 'b-mble-co'],
    ['Partner 2', 'partner-2'],
    ['!!!', ''],
  ])('%s becomes %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it('handles long runs of punctuation', () => {
    expect(slugify('a' + '!'.repeat(10000) + 'b')).toBe('a-b');
    expect(slugify('!'.repeat(10000) + 'a' + '!'.repeat(10000))).toBe('a');
  });
});
