import { describe, it, expect } from 'vitest';
import { z } from '../../zod';

describe('Zod Public Extension', () => {
  it('should add public method to ZodString', () => {
    const schema = z.string().public();
    expect((schema._def as any).isPublic).toBe(true);
  });

  it('should add public method to ZodNumber', () => {
    const schema = z.number().public();
    expect((schema._def as any).isPublic).toBe(true);
  });

  it('should add public method to ZodBoolean', () => {
    const schema = z.boolean().public();
    expect((schema._def as any).isPublic).toBe(true);
  });

  it('should add public method to ZodEnum', () => {
    const schema = z.enum(['light', 'dark']).public();
    expect((schema._def as any).isPublic).toBe(true);
  });

  it('should add public method to ZodArray', () => {
    const schema = z.array(z.string()).public();
    expect((schema._def as any).isPublic).toBe(true);
  });

  it('should add private method to all types', () => {
    const stringSchema = z.string().private();
    const numberSchema = z.number().private();
    const booleanSchema = z.boolean().private();

    expect((stringSchema._def as any).isPublic).toBe(false);
    expect((numberSchema._def as any).isPublic).toBe(false);
    expect((booleanSchema._def as any).isPublic).toBe(false);
  });

  it('should default to private when no method is called', () => {
    const schema = z.string();
    expect((schema._def as any).isPublic).toBeUndefined();
  });

  it('should work with chained methods', () => {
    const schema = z.string().min(5).public();
    expect((schema._def as any).isPublic).toBe(true);
  });

  it('should work with optional fields', () => {
    const schema = z.string().optional().public();
    expect((schema._def as any).isPublic).toBe(true);
  });
});
