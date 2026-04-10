export default function CookieSessionDemo() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Cross-subdomain Cookie Session</h1>
      <p className="text-gray-600 mb-6">
        Share a session across subdomains of the same parent domain using an HttpOnly refresh
        cookie. This is the secure replacement for the removed{' '}
        <code className="font-mono">_auth</code> URL token transfer (v2.31).
      </p>

      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Enable it in AuthConfig</h2>
        <pre className="text-xs overflow-x-auto bg-gray-50 p-3 rounded border">
{`<AuthProvider
  config={{
    enableCookieSession: true,
    onSessionExpired: (err) => navigate('/login'),
  }}
>
  {/* ... */}
</AuthProvider>`}
        </pre>
      </section>

      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Backend cookie requirements</h2>
        <p className="text-sm text-gray-600 mb-3">
          Your <code className="font-mono">/auth/refresh</code> endpoint must issue the refresh
          token as a cookie with these attributes:
        </p>
        <pre className="text-xs overflow-x-auto bg-gray-50 p-3 rounded border">
{`Set-Cookie: refresh_token=<token>;
            HttpOnly;
            Secure;
            SameSite=Lax;
            Domain=.example.com;
            Path=/auth/refresh;
            Max-Age=2592000`}
        </pre>
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>
            <code className="font-mono">Domain=.example.com</code> — leading dot is critical;
            lets the cookie flow between subdomains.
          </li>
          <li>
            <code className="font-mono">HttpOnly</code> — JavaScript cannot read the cookie,
            mitigating XSS token theft.
          </li>
          <li>
            <code className="font-mono">SameSite=Lax</code> — allows top-level navigation
            between subdomains, blocks third-party POSTs.
          </li>
        </ul>
      </section>

      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. CORS</h2>
        <p className="text-sm text-gray-600 mb-3">
          Your auth API must allow credentials from all subdomains that will use it:
        </p>
        <pre className="text-xs overflow-x-auto bg-gray-50 p-3 rounded border">
{`Access-Control-Allow-Origin: https://acme.example.com
Access-Control-Allow-Credentials: true`}
        </pre>
      </section>

      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. What happens on page load</h2>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-2">
          <li>
            <code className="font-mono">SessionManager</code> calls{' '}
            <code className="font-mono">POST /auth/refresh</code> with{' '}
            <code className="font-mono">credentials: 'include'</code>.
          </li>
          <li>Backend reads the HttpOnly cookie and issues a fresh access token in the JSON body.</li>
          <li>The access token lives in memory (and in localStorage for cold-restore).</li>
          <li>
            If the cookie is missing or expired, restore fails silently and the user must log in.
          </li>
        </ol>
      </section>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>See also:</strong>{' '}
          <a
            href="https://github.com/skylabs-digital/react-identity-access/blob/main/docs/migration-v2.31.md"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Migration to v2.31
          </a>{' '}
          and{' '}
          <a
            href="https://github.com/skylabs-digital/react-identity-access/blob/main/docs/security.md"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Security & Threat Model
          </a>
          .
        </p>
      </div>
    </div>
  );
}
