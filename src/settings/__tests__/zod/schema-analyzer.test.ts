import { describe, it, expect } from 'vitest';
import { z } from '../../zod';
import { SchemaAnalyzer } from '../../zod/schema-analyzer';

describe('SchemaAnalyzer', () => {
  const testSchema = z.object({
    publicField: z.string().public(),
    privateField: z.string(),
    publicNumber: z.number().public(),
    privateBoolean: (z.boolean() as any).private(),
    nested: z.object({
      publicNested: z.string().public(),
      privateNested: z.number(),
    }),
    publicArray: z.array(z.string()).public(),
  });

  describe('getPublicFields', () => {
    it('should identify public fields correctly', () => {
      const publicFields = SchemaAnalyzer.getPublicFields(testSchema);

      expect(publicFields).toEqual([
        'publicField',
        'publicNumber',
        'nested.publicNested',
        'publicArray',
      ]);
    });

    it('should handle empty schema', () => {
      const emptySchema = z.object({});
      const publicFields = SchemaAnalyzer.getPublicFields(emptySchema);

      expect(publicFields).toEqual([]);
    });

    it('should handle schema with no public fields', () => {
      const privateSchema = z.object({
        field1: z.string(),
        field2: (z.number() as any).private(),
      });
      const publicFields = SchemaAnalyzer.getPublicFields(privateSchema);

      expect(publicFields).toEqual([]);
    });

    it('should handle deeply nested objects', () => {
      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.string().public(),
          }),
        }),
      });
      const publicFields = SchemaAnalyzer.getPublicFields(deepSchema);

      expect(publicFields).toEqual(['level1.level2.level3']);
    });
  });

  describe('extractPublicSettings', () => {
    const testSettings = {
      publicField: 'public value',
      privateField: 'private value',
      publicNumber: 42,
      privateBoolean: true,
      nested: {
        publicNested: 'nested public',
        privateNested: 123,
      },
      publicArray: ['item1', 'item2'],
    };

    it('should extract only public settings', () => {
      const publicSettings = SchemaAnalyzer.extractPublicSettings(testSettings, testSchema);

      expect(publicSettings).toEqual({
        publicField: 'public value',
        publicNumber: 42,
        nested: {
          publicNested: 'nested public',
        },
        publicArray: ['item1', 'item2'],
      });
    });

    it('should handle missing nested objects', () => {
      const partialSettings = {
        publicField: 'public value',
        publicNumber: 42,
      };

      const publicSettings = SchemaAnalyzer.extractPublicSettings(partialSettings, testSchema);

      expect(publicSettings).toEqual({
        publicField: 'public value',
        publicNumber: 42,
      });
    });

    it('should handle empty settings', () => {
      const publicSettings = SchemaAnalyzer.extractPublicSettings({}, testSchema);

      expect(publicSettings).toEqual({});
    });

    it('should preserve array structure', () => {
      const settingsWithArray = {
        publicArray: [
          { id: 1, name: 'test' },
          { id: 2, name: 'test2' },
        ],
      };

      const publicSettings = SchemaAnalyzer.extractPublicSettings(
        settingsWithArray,
        z.object({ publicArray: z.array(z.any()).public() })
      );

      expect(publicSettings).toEqual(settingsWithArray);
    });
  });

  describe('isFieldPublic', () => {
    it('should correctly identify public fields', () => {
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'publicField')).toBe(true);
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'publicNumber')).toBe(true);
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'nested.publicNested')).toBe(true);
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'publicArray')).toBe(true);
    });

    it('should correctly identify private fields', () => {
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'privateField')).toBe(false);
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'privateBoolean')).toBe(false);
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'nested.privateNested')).toBe(false);
    });

    it('should return false for non-existent fields', () => {
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'nonExistent')).toBe(false);
      expect(SchemaAnalyzer.isFieldPublic(testSchema, 'nested.nonExistent')).toBe(false);
    });
  });
});
