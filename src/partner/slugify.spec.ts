import { slugify } from './slugify';

describe('slugify', () => {
  it.each([
    ['Bumble', 'bumble'],
    ['Badoo', 'badoo'],
    ['Test Partner', 'test-partner'],
    ['Test Partner Plus', 'test-partner-plus'],
    ['  Retired  Partner! ', 'retired-partner'],
    ['B_mble & Co.', 'b-mble-co'],
    ['Partner 2', 'partner-2'],
    ['!!!', ''],
  ])('%s becomes %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});
