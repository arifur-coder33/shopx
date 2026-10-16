const buildNestedSelect = (expandProperties = []) => {
  const select = {
    id: true,
  };

  for (const prop of expandProperties) {
    if (prop.type === "expand" && prop.expandSource) {
      // Recursively build nested expand select
      select[prop.expandSource] = {
        select: buildNestedSelect(prop.expandProperties),
      };
    } else if (prop.field) {
      const path = prop.field.split(".");

      let current = select;
      for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i === path.length - 1) {
          current[key] = true;
        } else {
          current[key] = current[key] || { select: {} };
          current = current[key].select;
        }
      }
    }
  }

  return select;
};

export const getDataSelectFields = (tableProperties = []) => {
  const fields = { id: true };

  for (const prop of tableProperties) {
    // Handle nested fields like "thumbnail.url" or "category.name"
    if (prop.field && prop.field.includes(".")) {
      const path = prop.field.split(".");
      let current = fields;
      for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i === path.length - 1) {
          current[key] = true; // Mark the final field for selection
        } else {
          current[key] = current[key] || { select: {} };
          current = current[key].select;
        }
      }
    } else if (prop.field && prop.type !== "expand" && prop.type !== "computed") {
      // Direct fields
      fields[prop.field] = true;
    }

    if (prop.type === "expand" && prop.expandSource) {
      fields[prop.expandSource] = {
        select: buildNestedSelect(prop.expandProperties),
      };
    }
  }

  return fields;
};
