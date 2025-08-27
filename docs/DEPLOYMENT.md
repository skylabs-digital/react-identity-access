# Deployment Guide

Complete deployment guide for React Identity Access applications across different environments and platforms.

## Environment Configuration

### Development Environment

```typescript
// src/config/development.ts
export const developmentConfig = {
  connector: {
    type: 'localStorage' as const,
    appId: 'my-app-dev',
    seedData: {
      tenants: [
        { id: 'demo', name: 'Demo Tenant', domain: 'demo.localhost' }
      ],
      users: [
        { 
          id: '1', 
          email: 'admin@demo.com', 
          name: 'Admin User',
          tenantId: 'demo',
          roles: ['admin']
        }
      ],
      passwords: [
        { userId: '1', hash: 'admin123' }
      ]
    }
  },
  tenant: {
    strategy: 'query-param' as const,
    fallback: '/select-tenant'
  }
};
```

### Staging Environment

```typescript
// src/config/staging.ts
export const stagingConfig = {
  connector: {
    type: 'fetch' as const,
    appId: 'my-app-staging',
    baseUrl: 'https://api-staging.myapp.com',
    apiKey: process.env.REACT_APP_STAGING_API_KEY,
    timeout: 15000
  },
  tenant: {
    strategy: 'subdomain' as const,
    fallback: 'https://staging.myapp.com'
  }
};
```

### Production Environment

```typescript
// src/config/production.ts
export const productionConfig = {
  connector: {
    type: 'fetch' as const,
    appId: 'my-app',
    baseUrl: 'https://api.myapp.com',
    apiKey: process.env.REACT_APP_API_KEY,
    timeout: 10000
  },
  tenant: {
    strategy: 'subdomain' as const,
    fallback: 'https://myapp.com'
  }
};
```

### Configuration Factory

```typescript
// src/config/index.ts
import { developmentConfig } from './development';
import { stagingConfig } from './staging';
import { productionConfig } from './production';

export const getConfig = () => {
  switch (process.env.NODE_ENV) {
    case 'development':
      return developmentConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
};
```

## Environment Variables

### Required Variables

```bash
# .env.production
REACT_APP_API_URL=https://api.myapp.com
REACT_APP_API_KEY=your-api-key
REACT_APP_APP_ID=my-app
REACT_APP_ENVIRONMENT=production

# Optional
REACT_APP_SENTRY_DSN=https://your-sentry-dsn
REACT_APP_ANALYTICS_ID=your-analytics-id
REACT_APP_SUPPORT_EMAIL=support@myapp.com
```

### Development Variables

```bash
# .env.development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_API_KEY=dev-api-key
REACT_APP_APP_ID=my-app-dev
REACT_APP_ENVIRONMENT=development
REACT_APP_MOCK_AUTH=true
```

### Staging Variables

```bash
# .env.staging
REACT_APP_API_URL=https://api-staging.myapp.com
REACT_APP_API_KEY=staging-api-key
REACT_APP_APP_ID=my-app-staging
REACT_APP_ENVIRONMENT=staging
```

## Build Configuration

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          identity: ['react-identity-access']
        }
      }
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@config': resolve(__dirname, 'src/config')
    }
  },
  
  server: {
    port: 3000,
    proxy: mode === 'development' ? {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    } : undefined
  }
}));
```

### Webpack Configuration (Create React App)

```javascript
// config-overrides.js (with react-app-rewired)
const { override, addWebpackAlias, addWebpackPlugin } = require('customize-cra');
const webpack = require('webpack');
const path = require('path');

module.exports = override(
  addWebpackAlias({
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@config': path.resolve(__dirname, 'src/config')
  }),
  
  addWebpackPlugin(
    new webpack.DefinePlugin({
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    })
  )
);
```

## Platform Deployments

### Vercel Deployment

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.myapp.com/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "@api-url",
    "REACT_APP_API_KEY": "@api-key"
  },
  "build": {
    "env": {
      "REACT_APP_ENVIRONMENT": "production"
    }
  }
}
```

### Netlify Deployment

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  REACT_APP_ENVIRONMENT = "production"

[[redirects]]
  from = "/api/*"
  to = "https://api.myapp.com/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.staging]
  command = "npm run build:staging"
  
[context.staging.environment]
  REACT_APP_ENVIRONMENT = "staging"
  REACT_APP_API_URL = "https://api-staging.myapp.com"
```

### AWS S3 + CloudFront

```yaml
# aws-deploy.yml (GitHub Actions)
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        REACT_APP_API_URL: ${{ secrets.API_URL }}
        REACT_APP_API_KEY: ${{ secrets.API_KEY }}
        REACT_APP_ENVIRONMENT: production
    
    - name: Deploy to S3
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Sync S3
      run: |
        aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }} --delete
        aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # API proxy
        location /api/ {
            proxy_pass https://api.myapp.com/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
    }
}
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: react-identity-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: react-identity-app
  template:
    metadata:
      labels:
        app: react-identity-app
    spec:
      containers:
      - name: app
        image: myregistry/react-identity-app:latest
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: api-url
        - name: REACT_APP_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: api-key

---
apiVersion: v1
kind: Service
metadata:
  name: react-identity-service
spec:
  selector:
    app: react-identity-app
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  api-url: "https://api.myapp.com"

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  api-key: <base64-encoded-api-key>
```

## Multi-Tenant Deployment Strategies

### Subdomain Strategy

```typescript
// Multi-tenant subdomain deployment
const tenantConfig = {
  strategy: 'subdomain' as const,
  mapping: {
    'tenant1.myapp.com': 'tenant1',
    'tenant2.myapp.com': 'tenant2',
    'demo.myapp.com': 'demo'
  },
  fallback: 'https://myapp.com/select-tenant'
};
```

**DNS Configuration:**
```
*.myapp.com -> CNAME -> myapp.com
myapp.com -> A -> 1.2.3.4
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name *.myapp.com myapp.com;
    
    location / {
        proxy_pass http://app-backend;
        proxy_set_header Host $host;
        proxy_set_header X-Tenant-Domain $host;
    }
}
```

### Path-Based Strategy

```typescript
// Single domain, path-based tenants
const tenantConfig = {
  strategy: 'path' as const,
  mapping: {
    '/tenant1': 'tenant1',
    '/tenant2': 'tenant2',
    '/demo': 'demo'
  },
  fallback: '/select-tenant'
};
```

### Environment-Specific Tenants

```typescript
// Different tenant strategies per environment
const getTenantConfig = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      strategy: 'query-param' as const,
      fallback: '/select-tenant'
    };
  }
  
  return {
    strategy: 'subdomain' as const,
    fallback: 'https://myapp.com/select-tenant'
  };
};
```

## Performance Optimization

### Build Optimization

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "vite build --mode analyze",
    "build:staging": "vite build --mode staging",
    "preview": "vite preview"
  }
}
```

### Code Splitting

```typescript
// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Settings = lazy(() => import('./components/Settings'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

// Route-based splitting
const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  </Suspense>
);
```

### Bundle Analysis

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('react-identity-access')) return 'identity';
            return 'vendor';
          }
        }
      }
    }
  }
});
```

## Monitoring and Observability

### Error Tracking

```typescript
// src/utils/errorTracking.ts
import * as Sentry from '@sentry/react';

export const initErrorTracking = () => {
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: process.env.REACT_APP_ENVIRONMENT,
      integrations: [
        new Sentry.BrowserTracing(),
      ],
      tracesSampleRate: 1.0,
    });
  }
};

export const trackError = (error: Error, context?: any) => {
  console.error('Application Error:', error, context);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  }
};
```

### Analytics Integration

```typescript
// src/utils/analytics.ts
export const initAnalytics = () => {
  if (process.env.REACT_APP_ANALYTICS_ID) {
    // Google Analytics 4
    gtag('config', process.env.REACT_APP_ANALYTICS_ID);
  }
};

export const trackEvent = (action: string, category: string, label?: string) => {
  if (process.env.NODE_ENV === 'production') {
    gtag('event', action, {
      event_category: category,
      event_label: label,
    });
  }
};
```

### Health Checks

```typescript
// src/utils/healthCheck.ts
export const performHealthCheck = async () => {
  const checks = {
    api: false,
    auth: false,
    storage: false
  };
  
  try {
    // API health
    const apiResponse = await fetch('/api/health');
    checks.api = apiResponse.ok;
    
    // Auth service
    const authResponse = await fetch('/api/auth/health');
    checks.auth = authResponse.ok;
    
    // Local storage
    localStorage.setItem('health-check', 'ok');
    checks.storage = localStorage.getItem('health-check') === 'ok';
    localStorage.removeItem('health-check');
    
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  return checks;
};
```

## Security Considerations

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.myapp.com;
  font-src 'self';
">
```

### Environment Variable Security

```typescript
// Only expose necessary variables to client
const getClientConfig = () => ({
  apiUrl: process.env.REACT_APP_API_URL,
  appId: process.env.REACT_APP_APP_ID,
  environment: process.env.REACT_APP_ENVIRONMENT,
  // Never expose: API keys, secrets, internal URLs
});
```

### HTTPS Enforcement

```nginx
# nginx.conf
server {
    listen 80;
    server_name myapp.com *.myapp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name myapp.com *.myapp.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
}
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   ```bash
   # Check if variables are defined
   echo $REACT_APP_API_URL
   
   # Verify .env file location and naming
   ls -la .env*
   ```

2. **CORS Issues**
   ```typescript
   // Check API configuration
   const corsConfig = {
     origin: ['https://myapp.com', 'https://*.myapp.com'],
     credentials: true
   };
   ```

3. **Routing Issues**
   ```nginx
   # Ensure SPA routing works
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

### Debug Mode

```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  localStorage.setItem('debug', 'react-identity-access:*');
}
```

### Performance Debugging

```typescript
// Bundle size analysis
npm run build:analyze

// Runtime performance
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
observer.observe({ entryTypes: ['measure'] });
```
