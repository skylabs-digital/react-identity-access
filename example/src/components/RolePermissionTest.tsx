import React from 'react';
import { useAuth, Protected } from '@skylabs-digital/react-identity-access';

const RolePermissionTest: React.FC = () => {
  const {
    sessionManager,
    userRole,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  } = useAuth();

  const user = sessionManager.getUser();

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Role & Permission Testing</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p className="font-bold">Not Authenticated</p>
          <p>Please log in to test role-based permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-6">Role & Permission Testing</h1>

      {/* Current User Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Current User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>User Type:</strong> {user.userType}
            </p>
          </div>
          <div>
            <p>
              <strong>Role:</strong>
            </p>
            {userRole ? (
              <div className="ml-4">
                <p>{userRole.name}</p>
                <p className="text-sm text-gray-600">{userRole.description}</p>
              </div>
            ) : (
              <p className="ml-4 text-gray-500">No role assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* User Permissions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">User Permissions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {userPermissions.map((permission, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {String(permission)}
            </span>
          ))}
        </div>
        {userPermissions.length === 0 && (
          <p className="text-gray-500 italic">No permissions assigned</p>
        )}
      </div>

      {/* Permission Testing */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Permission Testing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Individual Permission Tests */}
          <div>
            <h3 className="text-lg font-medium mb-3">Individual Permissions</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasPermission('events.read') ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>events.read: {hasPermission('events.read') ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasPermission('events.create') ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>events.create: {hasPermission('events.create') ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasPermission('guests.read') ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>guests.read: {hasPermission('guests.read') ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasPermission('vendors.write') ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>vendors.write: {hasPermission('vendors.write') ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasPermission('budget.read') ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>budget.read: {hasPermission('budget.read') ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasPermission('timeline.write') ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>timeline.write: {hasPermission('timeline.write') ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasPermission('settings.write') ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>settings.write: {hasPermission('settings.write') ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Combined Permission Tests */}
          <div>
            <h3 className="text-lg font-medium mb-3">Combined Permissions</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasAnyPermission(['events.read', 'events.write']) ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>
                  Any Event Access:{' '}
                  {hasAnyPermission(['events.read', 'events.write']) ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasAllPermissions(['events.read', 'events.create', 'events.write']) ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>
                  Full Event Management:{' '}
                  {hasAllPermissions(['events.read', 'events.create', 'events.write'])
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasAnyPermission(['guests.read', 'guests.write']) ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>
                  Any Guest Access:{' '}
                  {hasAnyPermission(['guests.read', 'guests.write']) ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasAllPermissions(['vendors.read', 'vendors.create', 'vendors.write']) ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>
                  Full Vendor Management:{' '}
                  {hasAllPermissions(['vendors.read', 'vendors.create', 'vendors.write'])
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${hasAnyPermission(['budget.read', 'budget.write']) ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>
                  Any Budget Access:{' '}
                  {hasAnyPermission(['budget.read', 'budget.write']) ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Protected Component Examples */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Protected Component Examples</h2>
        <div className="space-y-4">
          {/* Single Permission Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3">Single Permission Protection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Protected
                requiredPermissions={['events.read']}
                fallback={
                  <div className="bg-red-100 text-red-700 p-3 rounded border">
                    ❌ No events.read permission
                  </div>
                }
              >
                <div className="bg-green-100 text-green-700 p-3 rounded border">
                  ✅ Can view events
                </div>
              </Protected>

              <Protected
                requiredPermissions={['events.create']}
                fallback={
                  <div className="bg-red-100 text-red-700 p-3 rounded border">
                    ❌ No events.create permission
                  </div>
                }
              >
                <div className="bg-green-100 text-green-700 p-3 rounded border">
                  ✅ Can create events
                </div>
              </Protected>

              <Protected
                requiredPermissions={['guests.delete']}
                fallback={
                  <div className="bg-red-100 text-red-700 p-3 rounded border">
                    ❌ No guests.delete permission
                  </div>
                }
              >
                <div className="bg-green-100 text-green-700 p-3 rounded border">
                  ✅ Can delete guests
                </div>
              </Protected>
            </div>
          </div>

          {/* Multiple Permission Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3">Multiple Permission Protection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Protected
                requiredPermissions={['events.read', 'events.write']}
                requireAllPermissions={false}
                fallback={
                  <div className="bg-red-100 text-red-700 p-3 rounded border">
                    ❌ No event access
                  </div>
                }
              >
                <div className="bg-green-100 text-green-700 p-3 rounded border">
                  ✅ Has some event access (ANY)
                </div>
              </Protected>

              <Protected
                requiredPermissions={['vendors.read', 'vendors.create', 'vendors.write']}
                requireAllPermissions={true}
                fallback={
                  <div className="bg-red-100 text-red-700 p-3 rounded border">
                    ❌ Missing some vendor permissions
                  </div>
                }
              >
                <div className="bg-green-100 text-green-700 p-3 rounded border">
                  ✅ Has full vendor management (ALL)
                </div>
              </Protected>
            </div>
          </div>

          {/* Action Button Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3">Action Button Examples</h3>
            <div className="flex flex-wrap gap-3">
              <Protected
                requiredPermissions={['events.create']}
                fallback={
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Create Event (No Permission)
                  </button>
                }
              >
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  Create Event
                </button>
              </Protected>

              <Protected
                requiredPermissions={['vendors.write']}
                fallback={
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Edit Vendor (No Permission)
                  </button>
                }
              >
                <button className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
                  Edit Vendor
                </button>
              </Protected>

              <Protected
                requiredPermissions={['guests.delete']}
                fallback={
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Delete Guest (No Permission)
                  </button>
                }
              >
                <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                  Delete Guest
                </button>
              </Protected>

              <Protected
                requiredPermissions={['budget.write']}
                fallback={
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Manage Budget (No Permission)
                  </button>
                }
              >
                <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                  Manage Budget
                </button>
              </Protected>

              <Protected
                requiredPermissions={['timeline.write']}
                fallback={
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    Edit Timeline (No Permission)
                  </button>
                }
              >
                <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                  Edit Timeline
                </button>
              </Protected>

              <Protected
                requiredPermissions={['settings.write']}
                fallback={
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
                  >
                    System Settings (No Permission)
                  </button>
                }
              >
                <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                  System Settings
                </button>
              </Protected>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionTest;
