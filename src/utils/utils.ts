export const hasFeatureLiveChat = (partnerAccesses) => {
  return !!partnerAccesses.map((pa) => {
    return pa.featureLiveChat === true;
  });
};

export const generateRandomString = (length: number) => {
  return [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
};
