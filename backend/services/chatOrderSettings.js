export function isChatOrderCreationEnabled(setting) {
  const saved = Array.isArray(setting?.quickReplies)
    ? setting.quickReplies.find((entry) => entry?.__chatOrderConfig === true)
    : null;
  return saved?.enabled !== false;
}
