export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 days
    updateAge: 5 * 60,
  },
};
