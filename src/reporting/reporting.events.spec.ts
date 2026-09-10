import { renderedEventNames, toEventNames } from './reporting.events';

describe('reporting.events', () => {
  it('toEventNames normalises a string or string[] to a list', () => {
    expect(toEventNames('A')).toEqual(['A']);
    expect(toEventNames(['A', 'B'])).toEqual(['A', 'B']);
  });

  it('renderedEventNames flattens multi-name items so the persistence allowlist keeps old + new', () => {
    const names = renderedEventNames();
    // Merged video "viewed" item — new + both legacy names must all be present.
    expect(names.has('RESOURCE_VIDEO_VIEWED')).toBe(true);
    expect(names.has('RESOURCE_SHORT_VIDEO_VIEWED')).toBe(true);
    expect(names.has('RESOURCE_SINGLE_VIDEO_VIEWED')).toBe(true);
    // Merged audio "audio started" item.
    expect(names.has('RESOURCE_AUDIO_STARTED')).toBe(true);
    expect(names.has('RESOURCE_CONVERSATION_AUDIO_STARTED')).toBe(true);
  });

  it('does not carry the transient double-word names from the redesign→7a-fix window', () => {
    const names = renderedEventNames();
    expect(names.has('RESOURCE_AUDIO_AUDIO_STARTED')).toBe(false);
    expect(names.has('RESOURCE_VIDEO_VIDEO_STARTED')).toBe(false);
  });
});
