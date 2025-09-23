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
