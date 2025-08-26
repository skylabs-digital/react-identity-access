import { SettingsConnector } from '../core/types';
import { SchemaAnalyzer } from '../zod/schema-analyzer';
import { z } from 'zod';

export class LocalStorageConnector implements SettingsConnector {
  private getStorageKey(
    appId: string,
    tenantId: string,
    type: 'public' | 'private' | 'schema'
  ): string {
    return `settings:${appId}:${tenantId}:${type}`;
  }

  async getPublicSettings(appId: string, tenantId: string): Promise<any> {
    const key = this.getStorageKey(appId, tenantId, 'public');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async getPrivateSettings(appId: string, tenantId: string): Promise<any> {
    const key = this.getStorageKey(appId, tenantId, 'private');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async updateSettings(appId: string, tenantId: string, settings: any): Promise<void> {
    // Store complete settings as private
    const privateKey = this.getStorageKey(appId, tenantId, 'private');
    localStorage.setItem(privateKey, JSON.stringify(settings));

    // Extract and store public settings
    const schemaKey = this.getStorageKey(appId, tenantId, 'schema');
    const schemaData = localStorage.getItem(schemaKey);

    if (schemaData) {
      const { schema } = JSON.parse(schemaData);
      const zodSchema = this.deserializeSchema(schema);
      const publicSettings = SchemaAnalyzer.extractPublicSettings(settings, zodSchema);

      const publicKey = this.getStorageKey(appId, tenantId, 'public');
      localStorage.setItem(publicKey, JSON.stringify(publicSettings));
    }
  }

  async getSchema(appId: string, tenantId: string): Promise<any> {
    const key = this.getStorageKey(appId, tenantId, 'schema');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async updateSchema(appId: string, tenantId: string, schema: any, version: string): Promise<void> {
    const key = this.getStorageKey(appId, tenantId, 'schema');
    const schemaData = {
      schema: this.serializeSchema(schema),
      version,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(schemaData));
  }

  private serializeSchema(schema: z.ZodObject<any>): any {
    // Simple serialization - in a real implementation, you'd want more robust schema serialization
    return {
      type: 'object',
      shape: Object.entries(schema._def.shape).reduce((acc, [key, fieldSchema]: [string, any]) => {
        acc[key] = {
          type: this.getZodType(fieldSchema),
          isPublic: fieldSchema._def?.settingsHub?.isPublic === true,
          isOptional: fieldSchema.isOptional(),
        };
        return acc;
      }, {} as any),
    };
  }

  private deserializeSchema(serializedSchema: any): z.ZodObject<any> {
    // Simple deserialization - in a real implementation, you'd want more robust schema deserialization
    const shape: any = {};

    Object.entries(serializedSchema.shape).forEach(([key, fieldData]: [string, any]) => {
      let field: z.ZodType;

      switch (fieldData.type) {
        case 'string':
          field = z.string();
          break;
        case 'number':
          field = z.number();
          break;
        case 'boolean':
          field = z.boolean();
          break;
        default:
          field = z.any();
      }

      if (fieldData.isPublic) {
        field = field.public();
      }

      if (fieldData.isOptional) {
        field = field.optional();
      }

      shape[key] = field;
    });

    return z.object(shape);
  }

  private getZodType(schema: any): string {
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
}

// Export a singleton instance for convenience
export const localStorageConnector = new LocalStorageConnector();
