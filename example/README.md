# React Identity Access — Example App

A Vite-based React 19 application that demonstrates every major feature of `@skylabs-digital/react-identity-access`. It is the single starter devs can point at to see the library in action, and it doubles as a sandbox for exploring the public API.

The app has **two areas**:

- [`/demo/*`](src/pages/) — real feature pages wired to the full provider stack (App → Tenant → Auth → FeatureFlag → Subscription).
- [`/labs/*`](src/labs/) — low-level inspection labs for each provider and service. Useful while integrating with the library; not meant for end-users.

---

## Running the example

```bash
cd example
yarn install
yarn dev
```

Opens on http://localhost:3000. The nav bar links to both areas.

### Configuration

Set these in an `.env.local` file (or export them before running):

```env
VITE_BASE_URL=https://your-api.example.com/api
VITE_APP_ID=your-app-id
```

If not provided, the app falls back to the public Skylabs development backend (`https://idachu-dev.skylabs.digital/api`) so you can click around immediately.

---

## Demo pages (`/demo/*`)

| Route | File | Feature |
|---|---|---|
| `/demo` | [Home.tsx](src/pages/Home.tsx) | Landing page, links to every demo |
| `/demo/login` | [Login.tsx](src/pages/Login.tsx) | `<LoginForm>` component with email/phone + password |
| `/demo/signup` | [Signup.tsx](src/pages/Signup.tsx) | `<SignupForm>` component |
| `/demo/password-recovery` | [ForgotPassword.tsx](src/pages/ForgotPassword.tsx) | `<PasswordRecoveryForm>` request + reset flow |
| `/demo/magic-link` | [MagicLink.tsx](src/pages/MagicLink.tsx) | `<MagicLinkForm>` passwordless login |
| `/demo/magic-link/verify` | [MagicLinkVerifyPage.tsx](src/pages/MagicLinkVerifyPage.tsx) | Auto-verification of magic link tokens from URL |
| `/demo/dashboard` | [Dashboard.tsx](src/pages/Dashboard.tsx) | Authenticated dashboard, role-based view |
| `/demo/profile` | [Profile.tsx](src/pages/Profile.tsx) | Current user info via `useAuth()` |
| `/demo/settings` | [Settings.tsx](src/pages/Settings.tsx) | Tenant settings form with JSON Schema validation |
| `/demo/subscription` | [SubscriptionDemo.tsx](src/pages/SubscriptionDemo.tsx) | `useSubscription()` + `SubscriptionGuard` |
| `/demo/roles` | [RolePermissionTest.tsx](src/components/RolePermissionTest.tsx) | Interactive `Protected` / permission checks |
| `/demo/tenant-switch` | [TenantSwitchDemo.tsx](src/pages/TenantSwitchDemo.tsx) | Multi-tenant switching via `TenantSelector` |
| `/demo/standalone-auth` | [StandaloneAuthDemo.tsx](src/pages/StandaloneAuthDemo.tsx) | **v2.27+** — `<AuthProvider>` without App/Tenant providers |
| `/demo/cookie-session` | [CookieSessionDemo.tsx](src/pages/CookieSessionDemo.tsx) | **v2.31+** — `enableCookieSession` walkthrough |
| `/demo/zone-routing` | [ZoneRoutingDemo.tsx](src/pages/ZoneRoutingDemo.tsx) | **RFC-005** — `ZoneRoute`, `TenantZone`, `AdminZone` |

---

## Labs (`/labs/*`)

Inspection surfaces for each provider and service. These are not polished UI — they are scratchpads that render the raw state of contexts, expose action buttons, and let you poke at edge cases.

| Route | File | Focus |
|---|---|---|
| `/labs/auth` | [AuthPlayground.tsx](src/labs/AuthPlayground.tsx) | `useAuth()` state, login/logout actions |
| `/labs/session` | [SessionPlayground.tsx](src/labs/SessionPlayground.tsx) | Token lifecycle, refresh state |
| `/labs/tenant` | [TenantPlayground.tsx](src/labs/TenantPlayground.tsx) | Tenant detection, switching, settings |
| `/labs/user` | [UserPlayground.tsx](src/labs/UserPlayground.tsx) | Current user payload and roles |
| `/labs/api-services` | [ApiServicesPlayground.tsx](src/labs/ApiServicesPlayground.tsx) | Low-level `AuthApiService`, `UserApiService`, etc. |
| `/labs/providers` | [ProvidersPlayground.tsx](src/labs/ProvidersPlayground.tsx) | Provider readiness and context shapes |
| `/labs/refresh` | [RefreshLabPlayground.tsx](src/labs/RefreshLabPlayground.tsx) | Manually trigger refreshes, watch race conditions |

---

## Build

```bash
yarn build      # outputs to example/build/
yarn preview    # serve the production build locally
```

---

## What this example replaces

This single `example/` directory replaces the old `example/` (CRA) + `playground/` (Vite) split that existed before v2.31. Both were merged here, the build system was unified on Vite, and the demo pages and labs now live side by side under one nav bar.
