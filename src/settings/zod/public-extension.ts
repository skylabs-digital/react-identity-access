import { z } from 'zod';

// Extend Zod types to include public field marking
declare module 'zod' {
  interface ZodTypeDef {
    isPublic?: boolean;
  }

  interface ZodStringDef {
    isPublic?: boolean;
  }

  interface ZodNumberDef {
    isPublic?: boolean;
  }

  interface ZodBooleanDef {
    isPublic?: boolean;
  }

  interface ZodEnumDef<_T> {
    isPublic?: boolean;
  }

  interface ZodArrayDef<_T> {
    isPublic?: boolean;
  }

  interface ZodOptionalDef<_T> {
    isPublic?: boolean;
  }

  interface ZodType {
    public(): this;
    private(): this;
  }
}

// Add the public method to all Zod types
const originalZodType = z.ZodType.prototype;

originalZodType.public = function () {
  // Clone the current definition and add public flag
  const newDef = {
    ...this._def,
    isPublic: true,
  };

  // Create new instance with updated definition
  const Constructor = this.constructor as any;
  const newInstance = new Constructor(newDef);

  return newInstance;
};

originalZodType.private = function () {
  const newDef = {
    ...this._def,
    isPublic: false,
  };

  const Constructor = this.constructor as any;
  const newInstance = new Constructor(newDef);

  return newInstance;
};
