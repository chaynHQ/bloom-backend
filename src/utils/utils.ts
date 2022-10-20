export const generateRandomString = (length: number) => {
  return [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
};

export const getYesterdaysDate = () => new Date(new Date().setDate(new Date().getDate() - 1));
