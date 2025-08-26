import React, { useState } from 'react';
import { useAuth, useTenant } from '../../../src';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const { currentTenant } = useTenant();
  const [email, setEmail] = useState('admin@acme.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await login({ email, password });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const demoUsers = [
    { email: 'admin@acme.com', password: 'password', role: 'Admin' },
    { email: 'user@acme.com', password: 'password', role: 'User' },
    { email: 'admin@techstartup.com', password: 'password', role: 'Admin' }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#333', marginBottom: '10px' }}>Admin Login</h1>
          <p style={{ color: '#666', margin: 0 }}>
            {currentTenant?.name || 'Platform'} Administration
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Email:
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%',
                padding: '12px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Password:
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ 
                width: '100%',
                padding: '12px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              width: '100%',
              padding: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '30px' }}>
          <h4 style={{ color: '#333', marginBottom: '15px' }}>Demo Users:</h4>
          <div style={{ fontSize: '14px' }}>
            {demoUsers.map((user, index) => (
              <div 
                key={index}
                style={{ 
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setEmail(user.email);
                  setPassword(user.password);
                }}
              >
                <strong>{user.email}</strong> ({user.role})
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          borderTop: '1px solid #dee2e6',
          paddingTop: '20px'
        }}>
          <a 
            href="/" 
            style={{ 
              color: '#007bff', 
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            ← Back to Public Site
          </a>
        </div>
      </div>
    </div>
  );
}
