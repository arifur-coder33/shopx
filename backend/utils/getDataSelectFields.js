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
    if (prop.field && prop.type !== "expand") {
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
