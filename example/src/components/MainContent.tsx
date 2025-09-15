import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@skylabs-digital/react-identity-access';
import ApiTest from './ApiTest';

export default function MainContent() {
  const [count, setCount] = useState(0);
  const [libraryStatus] = useState<string>('Testing...');
  const { hasValidSession, logout } = useAuth();
  const location = useLocation();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Navigation */}
      <nav
        style={{
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              marginRight: '15px',
              color: location.pathname === '/' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/' ? 'bold' : 'normal',
            }}
          >
            Home
          </Link>
          <Link
            to="/login"
            style={{
              marginRight: '15px',
              color: location.pathname === '/login' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/login' ? 'bold' : 'normal',
            }}
          >
            Login
          </Link>
          <Link
            to="/signup"
            style={{
              marginRight: '15px',
              color: location.pathname === '/signup' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/signup' ? 'bold' : 'normal',
            }}
          >
            Signup
          </Link>
          <Link
            to="/password-recovery"
            style={{
              marginRight: '15px',
              color: location.pathname === '/password-recovery' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/password-recovery' ? 'bold' : 'normal',
            }}
          >
            Password Recovery
          </Link>
          <Link
            to="/protected"
            style={{
              marginRight: '15px',
              color: location.pathname === '/protected' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/protected' ? 'bold' : 'normal',
            }}
          >
            Protected Content
          </Link>
          <Link
            to="/feature-flags"
            style={{
              marginRight: '15px',
              color: location.pathname === '/feature-flags' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/feature-flags' ? 'bold' : 'normal',
            }}
          >
            Feature Flags
          </Link>
          <Link
            to="/admin"
            style={{
              marginRight: '15px',
              color: location.pathname === '/admin' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/admin' ? 'bold' : 'normal',
            }}
          >
            Admin Panel
          </Link>
          <Link
            to="/superuser"
            style={{
              marginRight: '15px',
              color: location.pathname === '/superuser' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/superuser' ? 'bold' : 'normal',
            }}
          >
            Super User
          </Link>
          <Link
            to="/subscription"
            style={{
              marginRight: '15px',
              color: location.pathname === '/subscription' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/subscription' ? 'bold' : 'normal',
            }}
          >
            Subscription
          </Link>
          <Link
            to="/roles-permissions"
            style={{
              color: location.pathname === '/roles-permissions' ? '#007bff' : '#333',
              textDecoration: 'none',
              fontWeight: location.pathname === '/roles-permissions' ? 'bold' : 'normal',
            }}
          >
            Roles & Permissions
          </Link>
        </div>
        {hasValidSession() && (
          <button
            onClick={logout}
            style={{
              padding: '8px 15px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        )}
      </nav>

      <h1>React Identity Access - Template</h1>
      <p>Testing providers integration...</p>

      <div
        style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}
      >
        <h3>Library Link Test</h3>
        <button
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Test Library Import
        </button>
        <p>Status: {libraryStatus}</p>
      </div>

      <div
        style={{ margin: '20px 0', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}
      >
        <h3>Basic React Test</h3>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          Count: {count}
        </button>
        <p>React hooks working: ✅</p>
      </div>

      <ApiTest />
    </div>
  );
}
