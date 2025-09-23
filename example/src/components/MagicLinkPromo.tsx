import { Link } from 'react-router-dom';
import { FeatureFlag } from '@skylabs-digital/react-identity-access';

export function MagicLinkPromo() {
  return (
    <FeatureFlag name="magic_link_promo" fallback={null}>
      <div
        style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '2rem',
          margin: '2rem 0',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
        <h3
          style={{
            color: '#0369a1',
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: '0 0 1rem 0',
          }}
        >
          Try Magic Link Authentication
        </h3>
        <p
          style={{
            color: '#0369a1',
            fontSize: '1rem',
            margin: '0 0 1.5rem 0',
            lineHeight: '1.6',
          }}
        >
          Experience passwordless authentication - more secure, faster, and hassle-free. Perfect for
          both login and signup!
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#0369a1',
            }}
          >
            <span>🔒</span>
            <span>More Secure</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#0369a1',
            }}
          >
            <span>⚡</span>
            <span>Faster Access</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#0369a1',
            }}
          >
            <span>🚫</span>
            <span>No Passwords</span>
          </div>
        </div>

        <Link
          to="/magic-link"
          style={{
            display: 'inline-block',
            backgroundColor: '#0369a1',
            color: 'white',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '1rem',
            fontWeight: '600',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#0284c7';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#0369a1';
          }}
        >
          ✨ Try Magic Link Now
        </Link>

        <div
          style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: '#0369a1',
            opacity: 0.8,
          }}
        >
          This promo is controlled by the "magic_link_promo" feature flag
        </div>
      </div>
    </FeatureFlag>
  );
}
