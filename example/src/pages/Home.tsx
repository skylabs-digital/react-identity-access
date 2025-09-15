import React from 'react';
import { Link } from 'react-router';
import { useAuth } from 'react-identity-access';

const Home: React.FC = () => {
  const { sessionManager, hasValidSession } = useAuth();
  const user = sessionManager.getUser();
  const isAuthenticated = hasValidSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              React Identity
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {' '}
                Access
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A powerful, modern authentication and authorization library for React applications.
              Secure, scalable, and developer-friendly.
            </p>

            {isAuthenticated ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-green-800 font-semibold">
                    Welcome back, {user?.name || user?.email}!
                  </span>
                </div>
                <p className="text-green-600 text-sm">You are successfully authenticated</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link
                  to="/login"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
                <Link
                  to="/roles"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-blue-600"
                >
                  View Demo
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need for authentication
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built with modern React patterns and TypeScript for a seamless developer experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Authentication */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🔐</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Authentication</h3>
              <p className="text-gray-600 mb-4">
                JWT-based authentication with automatic token refresh and secure session management.
              </p>
              <Link to="/login" className="text-blue-600 font-medium hover:text-blue-700">
                Try Login →
              </Link>
            </div>

            {/* Role-based Access */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Role-Based Access</h3>
              <p className="text-gray-600 mb-4">
                Granular permission system with role hierarchy and resource-based permissions.
              </p>
              <Link to="/roles" className="text-purple-600 font-medium hover:text-purple-700">
                Test Permissions →
              </Link>
            </div>

            {/* Dashboard */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Protected Routes</h3>
              <p className="text-gray-600 mb-4">
                Easily protect components and routes based on user permissions and roles.
              </p>
              <Link to="/dashboard" className="text-green-600 font-medium hover:text-green-700">
                View Dashboard →
              </Link>
            </div>

            {/* User Management */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">⚙️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">User Management</h3>
              <p className="text-gray-600 mb-4">
                Complete user profile management with password reset and account settings.
              </p>
              <Link to="/profile" className="text-orange-600 font-medium hover:text-orange-700">
                Manage Profile →
              </Link>
            </div>

            {/* TypeScript */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">TypeScript First</h3>
              <p className="text-gray-600 mb-4">
                Built with TypeScript for better developer experience and type safety.
              </p>
              <span className="text-indigo-600 font-medium">Fully Typed</span>
            </div>

            {/* Modern React */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Modern React</h3>
              <p className="text-gray-600 mb-4">
                Uses React hooks, context, and modern patterns for optimal performance.
              </p>
              <span className="text-teal-600 font-medium">React 18+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Ready to get started?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">For Developers</h3>
              <p className="text-gray-600 mb-4">
                Integrate React Identity Access into your application in minutes.
              </p>
              <div className="bg-gray-100 rounded p-3 text-left text-sm font-mono">
                npm install react-identity-access
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Try the Demo</h3>
              <p className="text-gray-600 mb-4">
                Explore all features with our interactive demo application.
              </p>
              <Link
                to={isAuthenticated ? '/dashboard' : '/login'}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors inline-block"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start Demo'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
