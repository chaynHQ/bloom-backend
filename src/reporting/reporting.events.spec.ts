import { renderedEventNames, toEventNames } from './reporting.events';

describe('reporting.events', () => {
  it('toEventNames normalises a string or string[] to a list', () => {
    expect(toEventNames('A')).toEqual(['A']);
    expect(toEventNames(['A', 'B'])).toEqual(['A', 'B']);
  });

  it('renderedEventNames flattens multi-name items so the persistence allowlist keeps every name', () => {
    const names = renderedEventNames();
    // "Videos → viewed" sums the current name and both pre-rename names.
    expect(names.has('RESOURCE_VIDEO_VIEWED')).toBe(true);
    expect(names.has('RESOURCE_SHORT_VIDEO_VIEWED')).toBe(true);
    expect(names.has('RESOURCE_SINGLE_VIDEO_VIEWED')).toBe(true);
    // "Audio → audio started" sums the current name and the pre-rename name.
    expect(names.has('RESOURCE_AUDIO_STARTED')).toBe(true);
    expect(names.has('RESOURCE_CONVERSATION_AUDIO_STARTED')).toBe(true);
  });
});
