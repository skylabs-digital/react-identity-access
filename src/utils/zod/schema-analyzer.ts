import { z } from 'zod';

export interface FieldMetadata {
  name: string;
  isPublic: boolean;
  type: string;
  isRequired: boolean;
  defaultValue?: any;
}

export class SchemaAnalyzer {
  static analyzeSchema(schema: z.ZodObject<any>): {
    publicFields: string[];
    privateFields: string[];
    fieldMetadata: Record<string, FieldMetadata>;
  } {
    const shape = schema._def.shape;
    const publicFields: string[] = [];
    const privateFields: string[] = [];
    const fieldMetadata: Record<string, FieldMetadata> = {};

    this.traverseSchema(shape, '', publicFields, privateFields, fieldMetadata);

    return { publicFields, privateFields, fieldMetadata };
  }

  static getPublicFields(schema: z.ZodObject<any>): string[] {
    const { publicFields } = this.analyzeSchema(schema);
    return publicFields;
  }

  static isFieldPublic(schema: z.ZodObject<any>, fieldPath: string): boolean {
    const publicFields = this.getPublicFields(schema);
    return publicFields.includes(fieldPath);
  }

  static extractPublicSettings(settings: any, schema: z.ZodObject<any>): any {
    const publicFields = this.getPublicFields(schema);
    const publicSettings: any = {};

    publicFields.forEach(fieldPath => {
      const value = this.getNestedValue(settings, fieldPath);
      if (value !== undefined) {
        this.setNestedValue(publicSettings, fieldPath, value);
      }
    });

    return publicSettings;
  }

  static validatePublicAccess(fieldPath: string, schema: z.ZodObject<any>): boolean {
    return this.isFieldPublic(schema, fieldPath);
  }

  private static traverseSchema(
    shape: any,
    prefix: string,
    publicFields: string[],
    privateFields: string[],
    fieldMetadata: Record<string, FieldMetadata>
  ): void {
    Object.entries(shape).forEach(([fieldName, fieldSchema]: [string, any]) => {
      const fullPath = prefix ? `${prefix}.${fieldName}` : fieldName;
      const isPublic = fieldSchema._def?.isPublic === true;

      fieldMetadata[fullPath] = {
        name: fieldName,
        isPublic,
        type: this.getZodType(fieldSchema),
        isRequired: !fieldSchema.isOptional(),
        defaultValue: this.extractDefaultValue(fieldSchema),
      };

      if (isPublic) {
        publicFields.push(fullPath);
      } else {
        privateFields.push(fullPath);
      }

      // Handle nested objects
      if (fieldSchema instanceof z.ZodObject) {
        this.traverseSchema(
          fieldSchema._def.shape,
          fullPath,
          publicFields,
          privateFields,
          fieldMetadata
        );
      }
    });
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private static getZodType(schema: any): string {
    if (schema instanceof z.ZodString) return 'string';
    if (schema instanceof z.ZodNumber) return 'number';
    if (schema instanceof z.ZodBoolean) return 'boolean';
    if (schema instanceof z.ZodArray) return 'array';
    if (schema instanceof z.ZodObject) return 'object';
    if (schema instanceof z.ZodEnum) return 'enum';
    if (schema instanceof z.ZodOptional) return this.getZodType(schema._def.innerType);
    if (schema instanceof z.ZodNullable) return this.getZodType(schema._def.innerType);
    return 'unknown';
  }

  private static extractDefaultValue(schema: any): any {
    if (schema._def.defaultValue !== undefined) {
      return schema._def.defaultValue();
    }
    if (schema instanceof z.ZodOptional) {
      return this.extractDefaultValue(schema._def.innerType);
    }
    return undefined;
  }
}
