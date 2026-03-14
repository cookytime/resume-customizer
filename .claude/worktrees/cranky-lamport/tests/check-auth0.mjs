/**
 * Check Auth0 app config and fix if needed.
 * Run: node --env-file=.env.local tests/check-auth0.mjs
 */
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

async function main() {
  // Get mgmt token
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

  // Check app config
  const appRes = await fetch(`https://${AUTH0_DOMAIN}/api/v2/clients/${AUTH0_CLIENT_ID}?fields=grant_types,app_type,name`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const app = await appRes.json();
  console.log('App name:', app.name);
  console.log('App type:', app.app_type);
  console.log('Grant types:', JSON.stringify(app.grant_types, null, 2));
  console.log('Has password grant:', app.grant_types?.includes('password'));

  // Check tenant default directory
  const tenantRes = await fetch(`https://${AUTH0_DOMAIN}/api/v2/tenants/settings?fields=default_directory`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const tenant = await tenantRes.json();
  console.log('Default directory:', tenant.default_directory || 'NOT SET (this is required for password grant!)');

  if (!tenant.default_directory) {
    console.log('\nFIXING: Setting default_directory to Username-Password-Authentication...');
    const patchRes = await fetch(`https://${AUTH0_DOMAIN}/api/v2/tenants/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({ default_directory: 'Username-Password-Authentication' }),
    });
    const result = await patchRes.json();
    console.log('Set default_directory:', result.default_directory);
  }
}

main().catch(e => console.error(e));
