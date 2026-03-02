export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
    updateAge: 0.25 * 60,
  },
};
