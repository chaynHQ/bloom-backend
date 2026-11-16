import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePartnerAccessDto } from './create-partner-access.dto';

const errorsFor = async (therapySessionsRemaining: number) =>
  (
    await validate(
      plainToInstance(CreatePartnerAccessDto, {
        featureLiveChat: true,
        featureTherapy: true,
        therapySessionsRemaining,
        therapySessionsRedeemed: 0,
      }),
    )
  ).map((error) => error.property);

describe('CreatePartnerAccessDto', () => {
  it('leaves the therapy session limit to the partner', async () => {
    expect(await errorsFor(7)).toEqual([]);
    expect(await errorsFor(20)).toEqual([]);
  });

  it('rejects a negative number of sessions', async () => {
    expect(await errorsFor(-1)).toEqual(['therapySessionsRemaining']);
  });
});
