## [3.2.2](https://github.com/skylabs-digital/react-identity-access/compare/v3.2.1...v3.2.2) (2026-04-16)


### Bug Fixes

* **auth:** cache verifyMagicLink result to survive post-login remount ([d9fe672](https://github.com/skylabs-digital/react-identity-access/commit/d9fe6727c5918d9b8791e4207cb8fd278819d563))

## [3.2.1](https://github.com/skylabs-digital/react-identity-access/compare/v3.2.0...v3.2.1) (2026-04-11)


### Bug Fixes

* **ci:** detect real semantic-release bump before GH Packages publish ([109db1f](https://github.com/skylabs-digital/react-identity-access/commit/109db1f276ad98bba4755ad3ba5a92b4dc9df543))

# [3.2.0](https://github.com/skylabs-digital/react-identity-access/compare/v3.1.1...v3.2.0) (2026-04-11)


### Features

* **app:** allow AppProvider to mount without appId for SUPERUSER flows ([7ba3b58](https://github.com/skylabs-digital/react-identity-access/commit/7ba3b582e9cbaa2eb594a82eb27cf522c67e25d7))

## [3.1.1](https://github.com/skylabs-digital/react-identity-access/compare/v3.1.0...v3.1.1) (2026-04-10)


### Bug Fixes

* **auth:** skip auth header injection for public AuthApiService endpoints ([24e687d](https://github.com/skylabs-digital/react-identity-access/commit/24e687d8164565799f61fc4c4c77b2d2e5235b25))

# [3.1.0](https://github.com/skylabs-digital/react-identity-access/compare/v3.0.0...v3.1.0) (2026-04-10)


### Features

* **example:** consolidate example/ + playground/ into a single Vite starter ([1ea5170](https://github.com/skylabs-digital/react-identity-access/commit/1ea517063f853d5efd221be6f0c6811dd1e1eff0))
* **qa:** add agentic QA harness with flows, agents, helpers, and DSL ([a25ef7b](https://github.com/skylabs-digital/react-identity-access/commit/a25ef7b75a4402743d12ffd1dc85d88d881ec3ed))
* **session:** harden config validation, storage fallback, and add QA scenarios ([8483bfc](https://github.com/skylabs-digital/react-identity-access/commit/8483bfca08e8cf8ade4c8caa52ca4d891b7c9509))

# [3.0.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.32.0...v3.0.0) (2026-04-10)


* feat!: remove insecure _auth URL token transfer ([ed15f42](https://github.com/skylabs-digital/react-identity-access/commit/ed15f42131cd35d752d1b50899751d5016aef20d))


### BREAKING CHANGES

* cross-subdomain tenant switching now requires
enableCookieSession to be enabled. The _auth URL query parameter
mechanism has been removed because it allowed (1) session fixation
via URL-injected tokens and (2) refresh token leakage to server
access logs and Referer headers.

Consumers that rely on cross-subdomain tenant switching must set
enableCookieSession: true in their AuthProvider config and ensure
their backend sets the HttpOnly refresh cookie on the parent domain
so it is shared across all tenant subdomains.

Cross-apex tenant switching (different top-level domains per tenant)
is no longer supported. See the companion plan in
docs/superpowers/plans/ for the planned replacement using
backend-issued single-use handoff codes.

Removes:
- src/utils/crossDomainAuth.ts
- src/test/crossDomainAuth.test.ts
- src/test/crossSubdomainAuth.test.ts

Modifies:
- src/providers/AuthProvider.tsx
- src/providers/TenantProvider.tsx
- src/test/providerReadiness.test.tsx (drops _auth tests, keeps hook/params tests)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>

# [2.32.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.31.0...v2.32.0) (2026-04-10)


### Features

* add cross-subdomain shared cookie session support (enableCookieSession) ([575ffe1](https://github.com/skylabs-digital/react-identity-access/commit/575ffe1e03e128df26f2810e43f84716e8e78dc2))

# [2.31.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.30.0...v2.31.0) (2026-04-08)


### Features

* add dual publish to GitHub Packages and npm publishing guide ([cb4b727](https://github.com/skylabs-digital/react-identity-access/commit/cb4b7271740b5547e7883d92b23cd86a767076aa))

# [2.30.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.29.0...v2.30.0) (2026-04-07)


### Features

* extract deviceId from refresh token JWT for backends that require it ([672b1f8](https://github.com/skylabs-digital/react-identity-access/commit/672b1f82c0aacd5006b08ff3393d7747490b9419))

# [2.29.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.28.0...v2.29.0) (2026-04-07)


### Features

* fix multi-tab session loss with Web Locks API and add QA session simulator ([e462364](https://github.com/skylabs-digital/react-identity-access/commit/e46236412ddd13c8a1a6faccc72e014ec791d776))

# [2.28.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.27.0...v2.28.0) (2026-03-17)


### Features

* add circuit breaker to prevent infinite background refresh loops and classify token reuse/revocation as fatal ([2c12884](https://github.com/skylabs-digital/react-identity-access/commit/2c1288406e3c3f67f5678c51df9d94dc583ecd7d))

# [2.27.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.26.0...v2.27.0) (2026-03-12)


### Features

* make AuthProvider work standalone without AppProvider/TenantProvider and add magic link deduplication ([c3ce06f](https://github.com/skylabs-digital/react-identity-access/commit/c3ce06f1e0664990b5e00b01222eb5ebee23f677))

# [2.26.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.25.0...v2.26.0) (2026-03-09)


### Features

* add Windsurf workflows, standardization plan, and improve pre-commit hooks ([1278fb0](https://github.com/skylabs-digital/react-identity-access/commit/1278fb04e5de143ec5578fa8ac2fb067f183c847))

# [2.25.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.24.0...v2.25.0) (2026-03-09)


### Features

* update documentation to reflect new API signatures and add comprehensive component customization reference ([4549af4](https://github.com/skylabs-digital/react-identity-access/commit/4549af4b9b33ce7e8fbc550112b8690191dba8eb))

# [2.24.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.23.0...v2.24.0) (2026-02-25)


### Features

* remove periodic user data refresh and time-based caching in favor of on-demand loading ([aa2ec3f](https://github.com/skylabs-digital/react-identity-access/commit/aa2ec3f475fd42b147de0d3997d3a8b7e6ed826a))

# [2.23.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.22.0...v2.23.0) (2026-02-25)


### Features

* fix session restoration and token refresh race conditions ([b62e8af](https://github.com/skylabs-digital/react-identity-access/commit/b62e8af66bbafce3179c64ace59096ada53cd47b))

# [2.22.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.21.0...v2.22.0) (2026-02-25)


### Features

* add session generation tracking to prevent stale refresh attempts after logout ([db5396e](https://github.com/skylabs-digital/react-identity-access/commit/db5396e5e5cc08cf78af7b150e7f6e27f3c19bfc))

# [2.21.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.20.0...v2.21.0) (2026-02-25)


### Features

* convert SessionManager to singleton pattern to prevent duplicate instances per tenant ([3c40152](https://github.com/skylabs-digital/react-identity-access/commit/3c4015298ebc2b0c289dc8a6c4902a8134e93209))

# [2.20.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.19.0...v2.20.0) (2026-02-24)


### Features

* prevent double token refresh in React Strict Mode by deferring immediate backgroundRefresh ([5b30097](https://github.com/skylabs-digital/react-identity-access/commit/5b30097a879a39bf88184c77960e0bb448c676b1))

# [2.19.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.18.0...v2.19.0) (2026-02-20)


### Features

* add JWT exp claim fallback for token expiry detection ([fe46e8c](https://github.com/skylabs-digital/react-identity-access/commit/fe46e8cc12c5ba8a0b0aa8ebced70300f1ca7c5a))

# [2.18.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.17.0...v2.18.0) (2026-02-19)


### Features

* add interactive playground application for testing library features ([d2150f1](https://github.com/skylabs-digital/react-identity-access/commit/d2150f1142881406b0996069f276244ff98d1b6d))

# [2.17.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.16.0...v2.17.0) (2026-02-18)


### Features

* add session restoration tracking to prevent premature auth ready state ([d0b23fd](https://github.com/skylabs-digital/react-identity-access/commit/d0b23fd31e22bcafe9ff2fce3735419e5042e895))

# [2.16.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.15.0...v2.16.0) (2026-02-16)


### Features

* add fixed tenant mode for single-tenant applications ([4d5a9ef](https://github.com/skylabs-digital/react-identity-access/commit/4d5a9ef9166a67282e12e025e38c18fc25df13cc))

# [2.15.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.14.0...v2.15.0) (2026-01-05)


### Features

* refactor login flow to consistently handle redirects through switchTenant ([e3dea15](https://github.com/skylabs-digital/react-identity-access/commit/e3dea1501df45b413bb00dafffb2a3c8ada770ce))

# [2.14.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.13.0...v2.14.0) (2026-01-02)


### Features

* add comprehensive zone-based routing system documentation ([dba0c6e](https://github.com/skylabs-digital/react-identity-access/commit/dba0c6e40d58a654b12113894b99cd77fa4829c2))

# [2.13.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.12.0...v2.13.0) (2026-01-02)


### Features

* add RFC 0005 for zone-based routing system to simplify multi-tenant route protection ([0c312ac](https://github.com/skylabs-digital/react-identity-access/commit/0c312ac7103cd237c4f643b309d053547109bb8a))

# [2.12.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.11.0...v2.12.0) (2025-12-31)


### Features

* add token transfer support to path-based tenant switching ([e441157](https://github.com/skylabs-digital/react-identity-access/commit/e441157da680a871f18858994c1fd4593107d51e))

# [2.11.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.10.1...v2.11.0) (2025-12-31)


### Features

* add autoSwitch parameter to LoginParams to override global autoSwitchSingleTenant config ([76cadc6](https://github.com/skylabs-digital/react-identity-access/commit/76cadc69f2ff675b2ce9e1c51f0c2be57ff3eda9))

## [2.10.1](https://github.com/skylabs-digital/react-identity-access/compare/v2.10.0...v2.10.1) (2025-12-30)


### Bug Fixes

* replace minUserType with requiredUserType for exact user type matching in ProtectedRoute ([7ec91b5](https://github.com/skylabs-digital/react-identity-access/commit/7ec91b542924f59f52c698a4dc5cb9ec92b32464))

# [2.10.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.9.0...v2.10.0) (2025-12-30)


### Features

* add comprehensive multi-tenant authentication documentation and RFC ([c39e40e](https://github.com/skylabs-digital/react-identity-access/commit/c39e40e9a1095504bf5a2db9483b9f46cd29682e))

# [2.9.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.8.0...v2.9.0) (2025-12-29)


### Features

* add optional redirectPath parameter to login flow for post-authentication navigation ([541a66e](https://github.com/skylabs-digital/react-identity-access/commit/541a66ea93492a5678dc063c32ac4047339eca21))

# [2.8.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.7.0...v2.8.0) (2025-12-29)


### Features

* format debug log message for URL token detection to improve code readability ([83533e7](https://github.com/skylabs-digital/react-identity-access/commit/83533e7ace893695f7aad0a394ee426882d2ab40))
* initialize isLoadingAfterUrlTokens based on URL token presence to prevent race condition ([4e65d99](https://github.com/skylabs-digital/react-identity-access/commit/4e65d997685e1e9c9f6995d767ceb4ccc9672e00))

# [2.7.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.6.0...v2.7.0) (2025-12-29)


### Features

* block auth ready state until user data loads after URL token consumption ([da81bd0](https://github.com/skylabs-digital/react-identity-access/commit/da81bd031b753260b2d61a774c07b6c53a6e8ba0))

# [2.6.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.5.0...v2.6.0) (2025-12-29)


### Features

* add optional provider hooks and integrate ready states into AppLoader ([b4e34dc](https://github.com/skylabs-digital/react-identity-access/commit/b4e34dc1f0ed5666e7e85f64506dee006ceef9e8))

# [2.5.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.4.0...v2.5.0) (2025-12-29)


### Features

* refactor URL token processing to run synchronously before auth guards ([45ce138](https://github.com/skylabs-digital/react-identity-access/commit/45ce138ca84f28111dcaf0b4431c905082b5a101))

# [2.4.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.3.0...v2.4.0) (2025-12-29)


### Features

* add debug logging and fix race condition in cross-subdomain auth ([9817bd4](https://github.com/skylabs-digital/react-identity-access/commit/9817bd40764fbe9f405671a1e1cf377379b434d3))

# [2.3.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.2.0...v2.3.0) (2025-12-29)


### Features

* implement cross-subdomain authentication token transfer ([c67e949](https://github.com/skylabs-digital/react-identity-access/commit/c67e9498ed1aae6aab9cf8fcb1db051daec607c2))

# [2.2.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.1.0...v2.2.0) (2025-12-29)


### Features

* extract tenant hostname building logic to utility function ([ec6094e](https://github.com/skylabs-digital/react-identity-access/commit/ec6094e1214ebf99a983b82c41f254eb352dd0a8))

# [2.1.0](https://github.com/skylabs-digital/react-identity-access/compare/v2.0.1...v2.1.0) (2025-12-27)


### Features

* add AppLoader component and refactor provider loading behavior ([9786bdf](https://github.com/skylabs-digital/react-identity-access/commit/9786bdf398717cfa1d650366a5658eb910ffe58b))

## [2.0.1](https://github.com/skylabs-digital/react-identity-access/compare/v2.0.0...v2.0.1) (2025-12-19)


### Bug Fixes

* update GitHub Actions workflow and add API documentation ([75eddbf](https://github.com/skylabs-digital/react-identity-access/commit/75eddbfcbea3c023a2d618cf2f1eec7b493762a7))

# [2.0.0](https://github.com/skylabs-digital/react-identity-access/compare/v1.6.0...v2.0.0) (2025-11-21)


* feat!: refactor token handling and centralize user data logic ([6cc1fa0](https://github.com/skylabs-digital/react-identity-access/commit/6cc1fa001de065dc49d370f6ec786db5f4a43ac3))


### BREAKING CHANGES

* Complete refactor of authentication and token management

- Removed tenantId parameter from LoginParams and VerifyMagicLinkParams
- Auth methods now accept tenantSlug instead of tenantId for tenant switching
- Tenant ID is now resolved via public API endpoint using slug
- Centralized user data loading logic in loadUserData() method
- Added JWT token decoding with userId extraction as source of truth
- Exposed loadUserData(forceRefresh) in AuthContextValue for manual refresh
- Implemented intelligent caching with 5-minute TTL and periodic auto-refresh
- Auto-loads user data on mount when tokens exist but no userData present
- SessionManager now provides getTokenPayload() and getUserId() methods
- Removed manual localStorage manipulation outside SessionManager
- Simplified tenant switching logic to use SessionManager instances
- Updated all pre-built components to use new tenantSlug-based API

Migration guide:
- Replace tenantId with tenantSlug in login() and verifyMagicLink() calls
- Use public tenant info endpoint to resolve tenant slugs to IDs
- Tokens are now stored directly under correct tenant key from start
- No manual token copying needed after tenant switch

# [1.6.0](https://github.com/skylabs-digital/react-identity-access/compare/v1.5.0...v1.6.0) (2025-09-23)


### Features

* add magic link authentication with email/phone support ([831f2d8](https://github.com/skylabs-digital/react-identity-access/commit/831f2d8235e7292711e66e55382619e90785e76f))

# [1.5.0](https://github.com/skylabs-digital/react-identity-access/compare/v1.4.1...v1.5.0) (2025-09-18)


### Features

* add TenantRoute and LandingRoute components with lastName field support ([fd0c08b](https://github.com/skylabs-digital/react-identity-access/commit/fd0c08bb99935e322ba601417593c55df9b588aa))

# 1.0.0 (2025-09-15)


### Features

* add password visibility toggle and improve form accessibility ([5898190](https://github.com/skylabs-digital/react-identity-access/commit/589819002262a271898fb75cd0114bd732ecfb5b))
* add subscription and billing system with payment gateway integrations ([1ce6f38](https://github.com/skylabs-digital/react-identity-access/commit/1ce6f38a2c0cef883c7603478a278479007a45c2))
* add subscription page and route to navigation menu ([90a4b1b](https://github.com/skylabs-digital/react-identity-access/commit/90a4b1b65ff7a0c40638d4eb0e148ac95cd5a7cc))
* initialize e-commerce platform config with roles, plans and feature flags ([0879d16](https://github.com/skylabs-digital/react-identity-access/commit/0879d16ffcbc52d954bba3579a06b8ca9ce67210))
* initialize react-identity-access library with core components and documentation ([35dccaa](https://github.com/skylabs-digital/react-identity-access/commit/35dccaadb12e3103a7147c81e47209bf606249d7))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Magic Link Authentication Support
- **Magic Link Authentication**: Complete passwordless authentication system
- **MagicLinkForm Component**: Unified login/signup form with magic link support
- **Updated User Model**: Added optional `phoneNumber` field alongside `email`
- **Flexible Login**: `LoginForm` now accepts username (email or phone number)
- **Enhanced Signup**: `SignupForm` supports optional email/phone (at least one required)
- **API Integration**: New `sendMagicLink()` and `verifyMagicLink()` methods in AuthProvider
- **Cross-Navigation**: Seamless switching between traditional and magic link authentication
- **Auto-Verification**: Automatic token verification from URL parameters
- **Demo Integration**: Complete Magic Link demo in example application

### Changed
- **Breaking**: `LoginRequest` now uses `username` instead of `email` field
- **Enhanced**: `SignupRequest` and `CreateUserRequest` support optional email/phoneNumber
- **Improved**: All authentication forms now support cross-navigation between methods
- **Updated**: AuthProvider methods now handle email/phone flexibility

### Technical Details
- Added `MagicLinkRequest`, `MagicLinkResponse`, `VerifyMagicLinkRequest`, `VerifyMagicLinkResponse` interfaces
- Updated `AuthApiService` with magic link endpoints
- Enhanced form validation for email/phone requirements
- Maintained full backward compatibility for existing implementations

### Previous Features
- Initial release of react-identity-access library
- Multi-tenancy support with AppProvider
- Authentication system with AuthProvider  
- Authorization with role-based permissions
- Feature flags management
- Subscription management
- Session management with token handling
- Comprehensive TypeScript types
- React components for protected routes and forms
- API services for all domains
- Basic test suite with Vitest
