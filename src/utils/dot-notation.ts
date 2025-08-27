export const getNestedValue = (obj: any, path: string): any => {
  if (!obj) return undefined;
  if (!path) return obj;

  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;

    // Handle array indices like "items[0]" or "items.0"
    if (key.includes('[') && key.includes(']')) {
      const [arrayKey, indexPart] = key.split('[');
      const arrayIndex = parseInt(indexPart.replace(']', ''));

      if (isNaN(arrayIndex)) return undefined;

      return current?.[arrayKey]?.[arrayIndex];
    }

    return current?.[key];
  }, obj);
};

export const setNestedValue = (obj: any, path: string, value: any): any => {
  if (!obj || !path) return obj;

  // Create a deep clone to avoid mutation
  const cloned = JSON.parse(JSON.stringify(obj));

  const keys = path.split('.');
  const lastKey = keys.pop()!;

  const target = keys.reduce((current, key) => {
    if (key.includes('[') && key.includes(']')) {
      const [arrayKey, indexPart] = key.split('[');
      const arrayIndex = parseInt(indexPart.replace(']', ''));

      if (!current[arrayKey]) current[arrayKey] = [];
      if (!current[arrayKey][arrayIndex]) current[arrayKey][arrayIndex] = {};

      return current[arrayKey][arrayIndex];
    }

    if (!current[key]) current[key] = {};
    return current[key];
  }, cloned);

  // Handle array index in the last key
  if (lastKey.includes('[') && lastKey.includes(']')) {
    const [arrayKey, indexPart] = lastKey.split('[');
    const arrayIndex = parseInt(indexPart.replace(']', ''));

    if (!target[arrayKey]) target[arrayKey] = [];
    // Extend array if needed
    while (target[arrayKey].length <= arrayIndex) {
      target[arrayKey].push(undefined);
    }
    target[arrayKey][arrayIndex] = value;
  } else {
    target[lastKey] = value;
  }

  return cloned;
};

export const hasNestedProperty = (obj: any, path: string): boolean => {
  if (!obj || !path) return path === '';
  return getNestedValue(obj, path) !== undefined;
};

export const hasNestedValue = (obj: any, path: string): boolean => {
  return getNestedValue(obj, path) !== undefined;
};
