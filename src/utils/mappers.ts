// Data transformation utilities for API responses

export class ApiMappers {
  // Date string to Date object
  static toDate(dateString: string): Date {
    return new Date(dateString);
  }

  // Date object to ISO string
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  // Transform API response pagination meta
  static transformPaginationMeta(meta: any) {
    return {
      total: meta.total || 0,
      page: meta.page || 1,
      limit: meta.limit || 100,
      totalPages: meta.totalPages || 1,
      hasNext: meta.hasNext || false,
      hasPrev: meta.hasPrev || false,
    };
  }

  // Transform user data for display
  static transformUser(user: any) {
    return {
      ...user,
      createdAt: this.toDate(user.createdAt),
      updatedAt: this.toDate(user.updatedAt),
      displayName: user.name,
      isActiveUser: user.isActive,
    };
  }

  // Transform role data for display
  static transformRole(role: any) {
    return {
      ...role,
      createdAt: this.toDate(role.createdAt),
      updatedAt: this.toDate(role.updatedAt),
      permissionCount: role.permissions?.length || 0,
    };
  }

  // Transform tenant data for display
  static transformTenant(tenant: any) {
    return {
      ...tenant,
      createdAt: this.toDate(tenant.createdAt),
      updatedAt: this.toDate(tenant.updatedAt),
      displayName: tenant.name,
      hasCustomDomain: !!tenant.domain,
    };
  }

  // Transform subscription data for display
  static transformSubscription(subscription: any) {
    return {
      ...subscription,
      createdAt: this.toDate(subscription.createdAt),
      updatedAt: this.toDate(subscription.updatedAt),
      startDate: this.toDate(subscription.startDate),
      endDate: subscription.endDate ? this.toDate(subscription.endDate) : null,
      isActive: subscription.status === 'ACTIVE',
      isExpired: subscription.endDate ? new Date(subscription.endDate) < new Date() : false,
    };
  }

  // Transform app data for display
  static transformApp(app: any) {
    return {
      ...app,
      createdAt: this.toDate(app.createdAt),
      updatedAt: this.toDate(app.updatedAt),
      isAdminLevel: app.securityLevel === 'ADMIN',
      hasDefaultPlan: !!app.defaultSubscriptionPlanId,
    };
  }

  // Transform feature flag data for display
  static transformFeatureFlag(featureFlag: any) {
    return {
      ...featureFlag,
      createdAt: this.toDate(featureFlag.createdAt),
      updatedAt: this.toDate(featureFlag.updatedAt),
      isEnabled: featureFlag.isActive,
    };
  }

  // Transform permission data for display
  static transformPermission(permission: any) {
    return {
      ...permission,
      createdAt: this.toDate(permission.createdAt),
      updatedAt: this.toDate(permission.updatedAt),
      fullName: `${permission.resource}:${permission.action}`,
      isSystemLevel: !permission.appId,
    };
  }

  // Transform subscription plan data for display
  static transformSubscriptionPlan(plan: any) {
    return {
      ...plan,
      createdAt: this.toDate(plan.createdAt),
      updatedAt: this.toDate(plan.updatedAt),
      displayPrice: `${plan.currency} ${plan.price}`,
      isMonthly: plan.billingCycle === 'MONTHLY',
      featureCount: plan.features?.length || 0,
    };
  }

  // Transform error response
  static transformError(error: any) {
    return {
      code: error.error?.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      type: error.type || 'SYSTEM',
      isAuthError: error.type === 'AUTH',
      isValidationError: error.type === 'VALIDATION',
    };
  }

  // Transform query parameters for API calls
  static transformQueryParams(params: any): URLSearchParams {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    return searchParams;
  }
}
