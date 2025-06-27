export const getMinMax = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { min: 0, max: 0 };
  }

  const min = Math.min(...arr);
  const max = Math.max(...arr);
  console.log("Calculated min:", min, "max:", max);
  return { min, max };
};
