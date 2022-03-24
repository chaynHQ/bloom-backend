export const generateRandomString = (length: number) => {
  return [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
};
