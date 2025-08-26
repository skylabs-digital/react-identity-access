import { User, Tenant, Role, FeatureFlag } from '../../types';

export interface SeedData {
  tenants?: Tenant[];
  users?: User[];
  roles?: Role[];
  featureFlags?: Record<string, FeatureFlag>;
}

export class MockDataStore {
  private seedData: SeedData;

  constructor(seedData: SeedData) {
    if (!seedData) {
      throw new Error('MockDataStore requires seed data to be provided by the developer');
    }
    this.seedData = seedData;
  }

  seedStorage(storage: Storage, prefix: string): void {
    // Seed tenants
    if (this.seedData.tenants) {
      storage.setItem(`${prefix}tenants`, JSON.stringify(this.seedData.tenants));
    }

    // Seed users
    if (this.seedData.users) {
      storage.setItem(`${prefix}users`, JSON.stringify(this.seedData.users));
    }

    // Seed roles
    if (this.seedData.roles) {
      storage.setItem(`${prefix}roles`, JSON.stringify(this.seedData.roles));
    }

    // Seed feature flags
    if (this.seedData.featureFlags) {
      storage.setItem(`${prefix}featureFlags`, JSON.stringify(this.seedData.featureFlags));
    }
  }
}
