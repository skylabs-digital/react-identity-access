import { describe, it, expect } from 'vitest';
import { getNestedValue, setNestedValue, hasNestedProperty } from '../../utils/dot-notation';

describe('Dot Notation Utils', () => {
  const testObject = {
    simple: 'value',
    nested: {
      level1: {
        level2: 'deep value',
        array: [1, 2, 3],
      },
      boolean: true,
    },
    arrayOfObjects: [
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ],
    simpleArray: ['a', 'b', 'c'],
  };

  describe('getNestedValue', () => {
    it('should get simple property', () => {
      expect(getNestedValue(testObject, 'simple')).toBe('value');
    });

    it('should get nested property', () => {
      expect(getNestedValue(testObject, 'nested.level1.level2')).toBe('deep value');
      expect(getNestedValue(testObject, 'nested.boolean')).toBe(true);
    });

    it('should get array element by index', () => {
      expect(getNestedValue(testObject, 'nested.level1.array.0')).toBe(1);
      expect(getNestedValue(testObject, 'nested.level1.array.2')).toBe(3);
      expect(getNestedValue(testObject, 'simpleArray.1')).toBe('b');
    });

    it('should get property from array element', () => {
      expect(getNestedValue(testObject, 'arrayOfObjects.0.name')).toBe('first');
      expect(getNestedValue(testObject, 'arrayOfObjects.1.id')).toBe(2);
    });

    it('should return undefined for non-existent paths', () => {
      expect(getNestedValue(testObject, 'nonExistent')).toBeUndefined();
      expect(getNestedValue(testObject, 'nested.nonExistent')).toBeUndefined();
      expect(getNestedValue(testObject, 'nested.level1.array.10')).toBeUndefined();
    });

    it('should handle null and undefined objects', () => {
      expect(getNestedValue(null, 'any.path')).toBeUndefined();
      expect(getNestedValue(undefined, 'any.path')).toBeUndefined();
    });

    it('should handle empty path', () => {
      expect(getNestedValue(testObject, '')).toBe(testObject);
    });
  });

  describe('setNestedValue', () => {
    it('should set simple property', () => {
      const obj = { existing: 'value' };
      const result = setNestedValue(obj, 'new', 'new value');
      expect(result.new).toBe('new value');
      expect(result.existing).toBe('value');
    });

    it('should set nested property', () => {
      const obj = { nested: { existing: 'value' } };
      const result = setNestedValue(obj, 'nested.new', 'new value');
      expect(result.nested.new).toBe('new value');
      expect(result.nested.existing).toBe('value');
    });

    it('should create nested structure if it does not exist', () => {
      const obj = {};
      const result = setNestedValue(obj, 'level1.level2.level3', 'deep value');
      expect(result.level1.level2.level3).toBe('deep value');
    });

    it('should set array element by index', () => {
      const obj = { array: [1, 2, 3] };
      const result = setNestedValue(obj, 'array.1', 'updated');
      expect(result.array).toEqual([1, 'updated', 3]);
    });

    it('should extend array if index is beyond current length', () => {
      const obj = { array: [1, 2] };
      const result = setNestedValue(obj, 'array.4', 'new item');
      expect(result.array).toEqual([1, 2, undefined, undefined, 'new item']);
    });

    it('should set property in array element', () => {
      const obj = { items: [{ id: 1 }, { id: 2 }] };
      const result = setNestedValue(obj, 'items.0.name', 'first item');
      expect(result.items[0]).toEqual({ id: 1, name: 'first item' });
    });

    it('should not mutate original object', () => {
      const original = { nested: { value: 'original' } };
      const result = setNestedValue(original, 'nested.value', 'updated');

      expect(original.nested.value).toBe('original');
      expect(result.nested.value).toBe('updated');
    });

    it('should handle empty path by returning original object', () => {
      const obj = { test: 'value' };
      const result = setNestedValue(obj, '', 'new value');
      expect(result).toBe(obj);
    });
  });

  describe('hasNestedProperty', () => {
    it('should return true for existing simple property', () => {
      expect(hasNestedProperty(testObject, 'simple')).toBe(true);
    });

    it('should return true for existing nested property', () => {
      expect(hasNestedProperty(testObject, 'nested.level1.level2')).toBe(true);
      expect(hasNestedProperty(testObject, 'nested.boolean')).toBe(true);
    });

    it('should return true for existing array index', () => {
      expect(hasNestedProperty(testObject, 'nested.level1.array.0')).toBe(true);
      expect(hasNestedProperty(testObject, 'simpleArray.2')).toBe(true);
    });

    it('should return true for property in array element', () => {
      expect(hasNestedProperty(testObject, 'arrayOfObjects.0.name')).toBe(true);
      expect(hasNestedProperty(testObject, 'arrayOfObjects.1.id')).toBe(true);
    });

    it('should return false for non-existent properties', () => {
      expect(hasNestedProperty(testObject, 'nonExistent')).toBe(false);
      expect(hasNestedProperty(testObject, 'nested.nonExistent')).toBe(false);
      expect(hasNestedProperty(testObject, 'nested.level1.array.10')).toBe(false);
    });

    it('should return false for null and undefined objects', () => {
      expect(hasNestedProperty(null, 'any.path')).toBe(false);
      expect(hasNestedProperty(undefined, 'any.path')).toBe(false);
    });

    it('should handle empty path', () => {
      expect(hasNestedProperty(testObject, '')).toBe(true);
    });
  });
});
