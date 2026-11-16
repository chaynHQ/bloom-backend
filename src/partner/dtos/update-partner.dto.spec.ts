import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePartnerDto } from './update-partner.dto';

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(UpdatePartnerDto, body))).map((error) => error.property);

describe('UpdatePartnerDto', () => {
  it.each([0, 6, 20])('accepts therapySessionsPerCode %s', async (value) => {
    expect(await errorsFor({ therapySessionsPerCode: value })).toEqual([]);
  });

  it.each([-1, 21, 2.5, '6'])('rejects therapySessionsPerCode %s', async (value) => {
    expect(await errorsFor({ therapySessionsPerCode: value })).toEqual(['therapySessionsPerCode']);
  });

  it('accepts a boolean automaticAccessCode and rejects anything else', async () => {
    expect(await errorsFor({ automaticAccessCode: false })).toEqual([]);
    expect(await errorsFor({ automaticAccessCode: 'true' })).toEqual(['automaticAccessCode']);
  });

  it('accepts an empty body', async () => {
    expect(await errorsFor({})).toEqual([]);
  });
});
