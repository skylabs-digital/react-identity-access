# SSR Integration Guide

## Overview

The React Identity Access library supports Server-Side Rendering (SSR) by allowing you to inject initial state data directly into the IdentityProvider. This eliminates the need for backend requests during client-side hydration, improving performance and user experience.

## Basic SSR Setup

### 1. Inject Initial State

Pass the `initialState` prop to IdentityProvider with data from your SSR context:

```tsx
import { IdentityProvider, InitialState } from 'react-identity-access';

// In your SSR component
function App({ ssrData }: { ssrData: InitialState }) {
  return (
    <IdentityProvider 
      connector={connector}
      initialState={ssrData}
    >
      <YourApp />
    </IdentityProvider>
  );
}
```

### 2. InitialState Interface

```tsx
interface InitialState {
  tenant?: Tenant;
  user?: User;
  featureFlags?: Record<string, FeatureFlag>;
  roles?: Role[];
  permissions?: Permission[];
}
```

## Feature Flags with SSR

### Immediate Feature Flag Access

When you provide feature flags in the `initialState`, they become immediately available without any loading state:

```tsx
// Server-side data preparation
const ssrData: InitialState = {
  tenant: {
    id: 'acme-corp',
    name: 'Acme Corporation',
    // ... other tenant data
  },
  featureFlags: {
    'new-dashboard': {
      key: 'new-dashboard',
      name: 'New Dashboard Design',
      category: 'ui',
      serverEnabled: true,
      adminEditable: true,
      defaultState: true,
      tenantId: 'acme-corp',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    'premium-analytics': {
      key: 'premium-analytics',
      name: 'Premium Analytics',
      category: 'feature',
      serverEnabled: true,
      adminEditable: true,
      defaultState: false,
      tenantId: 'acme-corp',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  },
};

// Client-side usage - no loading state!
function MyComponent() {
  const { isEnabled, isLoading } = useFeatureFlags();
  
  // isLoading will be false immediately with SSR data
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {isEnabled('new-dashboard') && <NewDashboard />}
      {isEnabled('premium-analytics') && <PremiumAnalytics />}
    </div>
  );
}
```

### Benefits of SSR Feature Flags

1. **No Loading States**: Feature flags are available immediately on page load
2. **Better UX**: No flash of content while flags load
3. **SEO Friendly**: Search engines see the correct content based on feature flags
4. **Performance**: Eliminates additional API calls during hydration

## Next.js Integration

### Server-Side Data Fetching

```tsx
// pages/_app.tsx
import { GetServerSideProps } from 'next';
import { IdentityProvider, InitialState } from 'react-identity-access';

interface AppProps {
  pageProps: any;
  ssrIdentityData?: InitialState;
}

function MyApp({ Component, pageProps, ssrIdentityData }: AppProps) {
  return (
    <IdentityProvider 
      connector={connector}
      initialState={ssrIdentityData}
    >
      <Component {...pageProps} />
    </IdentityProvider>
  );
}

// In your page components
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context;
  
  // Extract tenant from subdomain or other strategy
  const tenantId = extractTenantFromRequest(req);
  
  // Get user from session/cookies
  const user = await getUserFromSession(req);
  
  // Fetch tenant data
  const tenant = tenantId ? await fetchTenant(tenantId) : null;
  
  // Fetch feature flags for tenant
  const featureFlags = tenant ? await fetchFeatureFlags(tenant.id) : {};
  
  // Fetch user roles and permissions
  const roles = user ? await fetchUserRoles(user.id) : [];
  const permissions = user ? await fetchUserPermissions(user.id) : [];

  const ssrIdentityData: InitialState = {
    tenant,
    user,
    featureFlags,
    roles,
    permissions,
  };

  return {
    props: {
      ssrIdentityData,
    },
  };
};
```

### Custom App with SSR

```tsx
// pages/_app.tsx
import App, { AppContext, AppProps } from 'next/app';
import { IdentityProvider, InitialState } from 'react-identity-access';

interface MyAppProps extends AppProps {
  ssrIdentityData?: InitialState;
}

class MyApp extends App<MyAppProps> {
  static async getInitialProps({ Component, ctx }: AppContext) {
    let pageProps = {};
    let ssrIdentityData: InitialState | undefined;

    // Get page props
    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    // Only fetch identity data on server-side
    if (ctx.req) {
      const tenantId = extractTenantFromRequest(ctx.req);
      const user = await getUserFromSession(ctx.req);
      
      if (tenantId) {
        const tenant = await fetchTenant(tenantId);
        const featureFlags = await fetchFeatureFlags(tenantId);
        
        ssrIdentityData = {
          tenant,
          user,
          featureFlags,
          roles: user ? await fetchUserRoles(user.id) : [],
          permissions: user ? await fetchUserPermissions(user.id) : [],
        };
      }
    }

    return { pageProps, ssrIdentityData };
  }

  render() {
    const { Component, pageProps, ssrIdentityData } = this.props;

    return (
      <IdentityProvider 
        connector={connector}
        initialState={ssrIdentityData}
      >
        <Component {...pageProps} />
      </IdentityProvider>
    );
  }
}

export default MyApp;
```

## Remix Integration

### Root Component

```tsx
// app/root.tsx
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { IdentityProvider, InitialState } from 'react-identity-access';

interface LoaderData {
  ssrIdentityData?: InitialState;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const tenantId = extractTenantFromUrl(url);
  const user = await getUserFromRequest(request);
  
  let ssrIdentityData: InitialState | undefined;
  
  if (tenantId) {
    const tenant = await fetchTenant(tenantId);
    const featureFlags = await fetchFeatureFlags(tenantId);
    
    ssrIdentityData = {
      tenant,
      user,
      featureFlags,
      roles: user ? await fetchUserRoles(user.id) : [],
      permissions: user ? await fetchUserPermissions(user.id) : [],
    };
  }

  return json<LoaderData>({ ssrIdentityData });
};

export default function App() {
  const { ssrIdentityData } = useLoaderData<LoaderData>();

  return (
    <html>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <IdentityProvider 
          connector={connector}
          initialState={ssrIdentityData}
        >
          <Outlet />
        </IdentityProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

## Gatsby Integration

### Wrap Root Element

```tsx
// gatsby-ssr.js and gatsby-browser.js
import React from 'react';
import { IdentityProvider } from 'react-identity-access';

export const wrapRootElement = ({ element, props }) => {
  // SSR data would be injected via context or props
  const ssrIdentityData = props?.pageContext?.ssrIdentityData;

  return (
    <IdentityProvider 
      connector={connector}
      initialState={ssrIdentityData}
    >
      {element}
    </IdentityProvider>
  );
};
```

### Page Query

```tsx
// In your page components
import { graphql } from 'gatsby';

export const query = graphql`
  query PageQuery {
    # Your GraphQL queries
  }
`;

export default function Page({ data, pageContext }) {
  // pageContext.ssrIdentityData would contain the initial state
  return <YourPageContent />;
}
```

## Performance Benefits

### Without SSR
1. Client loads and renders loading state
2. Client makes tenant resolution request
3. Client makes user authentication request  
4. Client makes feature flags request
5. Client makes roles/permissions request
6. Final render with all data

### With SSR
1. Server pre-fetches all identity data
2. Client receives complete initial state
3. Immediate render with all data (no loading states)

## Best Practices

### 1. Selective Data Loading

Only load the data you need for the initial render:

```tsx
const ssrIdentityData: InitialState = {
  tenant: await fetchTenant(tenantId),
  user: await getUserFromSession(req),
  // Only load critical feature flags
  featureFlags: await fetchCriticalFeatureFlags(tenantId),
  // Skip roles/permissions if not needed immediately
};
```

### 2. Error Handling

Handle SSR errors gracefully:

```tsx
export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const ssrIdentityData = await fetchIdentityData(context);
    return { props: { ssrIdentityData } };
  } catch (error) {
    console.error('SSR identity data fetch failed:', error);
    // Return empty props - client will handle normal initialization
    return { props: {} };
  }
};
```

### 3. Cache Management

Use appropriate caching strategies:

```tsx
// Cache tenant data (changes infrequently)
const tenant = await getCachedTenant(tenantId, { ttl: 3600 });

// Don't cache user sessions (security)
const user = await getUserFromSession(req);

// Cache feature flags with shorter TTL
const featureFlags = await getCachedFeatureFlags(tenantId, { ttl: 300 });
```

### 4. Hydration Validation

Ensure client-side hydration matches SSR state:

```tsx
// The library automatically handles this, but you can add validation
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('SSR Identity Data:', ssrIdentityData);
    console.log('Current State:', { user, tenant, featureFlags });
  }
}, []);
```

## Troubleshooting

### Common Issues

1. **Hydration Mismatches**
   - Ensure server and client use same data
   - Check timezone/date serialization
   - Validate feature flag states

2. **Performance Issues**
   - Avoid over-fetching data
   - Use appropriate caching
   - Consider lazy loading non-critical data

3. **Authentication Errors**
   - Validate session tokens on server
   - Handle expired sessions gracefully
   - Implement proper error boundaries

### Debug Mode

Enable debug mode to troubleshoot SSR issues:

```tsx
<IdentityProvider 
  connector={connector}
  initialState={ssrIdentityData}
  config={{ debugMode: true }}
>
  <App />
</IdentityProvider>
```

This will log SSR state injection and initialization details to the console.
