import React from 'react';
import { useAuth, Protected } from 'react-identity-access';
import { Link } from 'react-router';

const Dashboard: React.FC = () => {
  const { sessionManager, userRole, userPermissions, hasValidSession } = useAuth();

  const user = sessionManager.getUser();

  if (!hasValidSession() || !user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p className="font-bold">Authentication Required</p>
          <p className="mb-4">Please log in to access the dashboard.</p>
          <Link
            to="/login"
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome back, {user.name || user.email}!</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Email:</span>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Role:</span>
              <p className="text-gray-900">
                {typeof userRole === 'string' ? userRole : userRole?.name || 'No role assigned'}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Permissions:</span>
              <p className="text-gray-900">{userPermissions?.length || 0} permissions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Protected
          requiredPermissions={['products.read']}
          fallback={
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">📦</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-500">Products</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Access denied - requires products.read permission
              </p>
              <button className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed">
                View Products
              </button>
            </div>
          }
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">📦</span>
              </div>
              <h3 className="text-lg font-semibold text-blue-800">Products</h3>
            </div>
            <p className="text-blue-600 mb-4">Manage your product catalog and inventory</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
              View Products
            </button>
          </div>
        </Protected>

        <Protected
          requiredPermissions={['orders.read']}
          fallback={
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">📋</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-500">Orders</h3>
              </div>
              <p className="text-gray-400 mb-4">Access denied - requires orders.read permission</p>
              <button className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed">
                View Orders
              </button>
            </div>
          }
        >
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-green-800">Orders</h3>
            </div>
            <p className="text-green-600 mb-4">View and manage customer orders</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
              View Orders
            </button>
          </div>
        </Protected>

        <Protected
          requiredPermissions={['settings.read']}
          fallback={
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">⚙️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-500">Settings</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Access denied - requires settings.read permission
              </p>
              <button className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed">
                View Settings
              </button>
            </div>
          }
        >
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">⚙️</span>
              </div>
              <h3 className="text-lg font-semibold text-purple-800">Settings</h3>
            </div>
            <p className="text-purple-600 mb-4">Configure system and user settings</p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
              View Settings
            </button>
          </div>
        </Protected>

        <Protected
          requiredPermissions={['users.read']}
          fallback={
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">👥</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-500">Users</h3>
              </div>
              <p className="text-gray-400 mb-4">Access denied - requires users.read permission</p>
              <button className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed">
                Manage Users
              </button>
            </div>
          }
        >
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-indigo-800">Users</h3>
            </div>
            <p className="text-indigo-600 mb-4">Manage users and their permissions</p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors">
              Manage Users
            </button>
          </div>
        </Protected>

        <Protected
          requiredPermissions={['reports.read']}
          fallback={
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-500">Reports</h3>
              </div>
              <p className="text-gray-400 mb-4">Access denied - requires reports.read permission</p>
              <button className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed">
                View Reports
              </button>
            </div>
          }
        >
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-orange-800">Reports</h3>
            </div>
            <p className="text-orange-600 mb-4">View analytics and generate reports</p>
            <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
              View Reports
            </button>
          </div>
        </Protected>

        <Protected
          requiredPermissions={['billing.read']}
          fallback={
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">💳</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-500">Billing</h3>
              </div>
              <p className="text-gray-400 mb-4">Access denied - requires billing.read permission</p>
              <button className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed">
                View Billing
              </button>
            </div>
          }
        >
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">💳</span>
              </div>
              <h3 className="text-lg font-semibold text-teal-800">Billing</h3>
            </div>
            <p className="text-teal-600 mb-4">Manage subscriptions and billing</p>
            <button className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 transition-colors">
              View Billing
            </button>
          </div>
        </Protected>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/profile"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            View Profile
          </Link>
          <Link
            to="/roles"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Test Permissions
          </Link>
          <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
