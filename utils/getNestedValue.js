const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;
  // Split the path by dots and reduce over the object
  return path.split(".").reduce((current, key) => {
    return current ? current[key] : undefined;
  }, obj);
};
export default getNestedValue;
