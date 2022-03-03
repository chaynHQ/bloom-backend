export const hasFeatureLiveChat = (partnerAccesses) => {
  return !!partnerAccesses.map((pa) => {
    return pa.featureLiveChat === true;
  });
};
