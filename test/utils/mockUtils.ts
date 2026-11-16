export const createQueryBuilderMock = (modifications?: Record<string, jest.Mock>) =>
  jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(undefined),
    getMany: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    execute: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockReturnValueOnce({}),
    ...modifications,
  }));

// Applies the partner lookups' WHERE clauses to in-memory rows. Any other clause throws, so a
// change to the SQL (such as going back to LIKE) fails the specs instead of passing silently.
const partnerWhereClauses: Record<
  string,
  (partner: { name: string; slug: string }, params: Record<string, string>) => boolean
> = {
  'LOWER(partner.name) = LOWER(:value) OR partner.slug = LOWER(:value)': (partner, { value }) =>
    partner.name.toLowerCase() === value.toLowerCase() || partner.slug === value.toLowerCase(),
  'LOWER(partner.name) = LOWER(:name)': (partner, { name }) =>
    partner.name.toLowerCase() === name.toLowerCase(),
};

export const partnerLookupQueryBuilderMock = <T extends { name: string; slug: string }>(
  partners: T[],
) =>
  jest.fn(() => {
    let matches: T[] = [];
    const queryBuilder = {
      leftJoinAndSelect: jest.fn(() => queryBuilder),
      where: jest.fn((clause: string, params: Record<string, string>) => {
        const matcher = partnerWhereClauses[clause];
        if (!matcher) throw new Error(`Unexpected partner lookup: ${clause}`);
        matches = partners.filter((partner) => matcher(partner, params));
        return queryBuilder;
      }),
      getOne: jest.fn(async () => matches[0] ?? null),
    };
    return queryBuilder;
  });
