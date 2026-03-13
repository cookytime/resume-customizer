/**
 * Add password grant type to the Auth0 app.
 * Run: node --env-file=.env.local tests/fix-auth0-grants.mjs
 */
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

async function main() {
  const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });
  const { access_token } = await tokenRes.json();

  // Add password grant
  const patchRes = await fetch(`https://${AUTH0_DOMAIN}/api/v2/clients/${AUTH0_CLIENT_ID}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      grant_types: ['authorization_code', 'implicit', 'refresh_token', 'client_credentials', 'password'],
    }),
  });
  const result = await patchRes.json();
  console.log('Updated grant types:', JSON.stringify(result.grant_types));
  console.log('Has password grant:', result.grant_types?.includes('password'));
}

main().catch(e => console.error(e));
