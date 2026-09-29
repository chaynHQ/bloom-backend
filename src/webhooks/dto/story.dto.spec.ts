import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from '../../utils/constants';
import { StoryWebhookDto } from './story.dto';

const validate = (payload: Record<string, unknown>) =>
  validateSync(plainToInstance(StoryWebhookDto, payload), { whitelist: true });

describe('StoryWebhookDto', () => {
  it('accepts a Storyblok publish payload whose notification text contains punctuation', () => {
    // Regression: the generic XSS/SQL matcher rejected "--", "#", "..." etc. and 400'd real webhooks.
    const errors = validate({
      text: 'Story published: rigid-vs-relaxed-boundaries — draft #2 ... done',
      action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
      space_id: 142459,
      full_slug: 'shorts/rigid-vs-relaxed-boundaries',
    });
    expect(errors).toHaveLength(0);
  });

  it('requires a valid action', () => {
    expect(validate({ action: 'archived' }).length).toBeGreaterThan(0);
    expect(validate({}).length).toBeGreaterThan(0);
  });

  it('rejects a full_slug outside the slug charset', () => {
    const errors = validate({
      action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
      full_slug: '../../etc/passwd',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('full_slug');
  });
});
