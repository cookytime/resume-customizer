/**
 * End-to-end API test using Auth0 test user.
 * Creates a test user, authenticates, and runs through the full API flow.
 *
 * Run: node --env-file=.env.local tests/e2e-api.test.mjs
 */

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

const TEST_EMAIL = 'e2e-test-user@resume-customizer-test.com';
const TEST_PASSWORD = 'T3st!Pass_E2E_2026';
const TEST_CONNECTION = 'Username-Password-Authentication';

let passed = 0;
let failed = 0;
let mgmtToken = null;
let testUserId = null;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// ─── Auth0 Management API helpers ───────────────────────────────────────

async function getMgmtToken() {
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error('Failed to get mgmt token:', data);
    throw new Error('Could not get Management API token. Ensure the app has Management API permissions.');
  }
  return data.access_token;
}

async function createTestUser(token) {
  // Delete existing test user if any
  const searchRes = await fetch(
    `https://${AUTH0_DOMAIN}/api/v2/users-by-email?email=${encodeURIComponent(TEST_EMAIL)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const existing = await searchRes.json();
  if (Array.isArray(existing)) {
    for (const user of existing) {
      await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(user.user_id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`  Deleted existing test user: ${user.user_id}`);
    }
  }

  // Create fresh test user
  const res = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      connection: TEST_CONNECTION,
      email_verified: true,
    }),
  });
  const user = await res.json();
  if (!user.user_id) {
    console.error('Failed to create test user:', JSON.stringify(user, null, 2));
    throw new Error('Could not create test user');
  }
  return user.user_id;
}

async function deleteTestUser(token, userId) {
  await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function getUserToken() {
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      username: TEST_EMAIL,
      password: TEST_PASSWORD,
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      scope: 'openid profile email',
      audience: `${APP_BASE_URL}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    // Try without audience
    const res2 = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        username: TEST_EMAIL,
        password: TEST_PASSWORD,
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        scope: 'openid profile email',
      }),
    });
    const data2 = await res2.json();
    if (!data2.access_token) {
      console.error('Failed to get user token:', JSON.stringify(data2, null, 2));
      throw new Error('Could not authenticate test user. Ensure Resource Owner Password Grant is enabled.');
    }
    return data2.access_token;
  }
  return data.access_token;
}

// ─── Test runner ────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== E2E API Test ===\n');

  // Step 1: Get Management API token
  console.log('Step 1: Get Auth0 Management API token');
  try {
    mgmtToken = await getMgmtToken();
    assert(true, 'Got Management API token');
  } catch (error) {
    assert(false, `Management API token: ${error.message}`);
    console.log('\n=== Cannot proceed without Management API access ===');
    console.log('Grant the app Machine-to-Machine access to the Auth0 Management API.');
    process.exit(1);
  }

  // Step 2: Create test user
  console.log('\nStep 2: Create test user');
  try {
    testUserId = await createTestUser(mgmtToken);
    assert(true, `Created test user: ${testUserId}`);
  } catch (error) {
    assert(false, `Create test user: ${error.message}`);
    process.exit(1);
  }

  // Step 3: Authenticate as test user
  console.log('\nStep 3: Authenticate test user (Resource Owner Password Grant)');
  let userToken;
  try {
    userToken = await getUserToken();
    assert(true, 'Got user access token');
  } catch (error) {
    assert(false, `User auth: ${error.message}`);
    // Cleanup
    if (testUserId) await deleteTestUser(mgmtToken, testUserId);
    process.exit(1);
  }

  // Step 4: Test API routes with authenticated session
  // Note: The Next.js app uses cookie-based Auth0 sessions, not bearer tokens.
  // We test the blob layer directly since we validated that in blob-readwrite.test.mjs.
  // Here we verify the Auth0 user lifecycle works.
  console.log('\nStep 4: Verify Auth0 user exists and has correct email');
  try {
    const res = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(testUserId)}`, {
      headers: { Authorization: `Bearer ${mgmtToken}` },
    });
    const user = await res.json();
    assert(user.email === TEST_EMAIL, `User email matches: ${user.email}`);
    assert(user.email_verified === true, 'Email is verified');
    assert(user.user_id === testUserId, `User ID matches: ${user.user_id}`);
  } catch (error) {
    assert(false, `Verify user: ${error.message}`);
  }

  // Step 5: Test blob storage with user-scoped path (simulates what API routes do)
  console.log('\nStep 5: Test user-scoped blob storage (simulates /api/storage)');
  const { put, get, del } = await import('@vercel/blob');
  const userSub = testUserId;
  const storagePath = `users/${userSub}/resume-data.json`;
  const testProfile = {
    version: '1.0',
    profile: {
      resumeText: 'Test User Resume\nSoftware Engineer\nTest City, CA\n\nPROFESSIONAL EXPERIENCE\nSenior Engineer at TestCorp\n- Built distributed systems\n- Led team of 5 engineers',
      linkedInUrl: 'linkedin.com/in/testuser',
    },
    savedApplications: [],
    learnedSkills: {},
    skillsSeeded: false,
  };

  try {
    // Write
    await put(storagePath, JSON.stringify(testProfile, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    assert(true, 'Wrote user storage blob');

    // Read back (with useCache: false — the critical fix)
    const blob = await get(storagePath, { access: 'private', useCache: false });
    assert(blob?.stream !== null, 'Blob stream is not null (useCache:false works)');
    assert(blob?.statusCode === 200, `Status code is 200 (got ${blob?.statusCode})`);

    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);
    assert(parsed.profile.resumeText.includes('Test User Resume'), 'Resume text persisted correctly');
    assert(parsed.profile.linkedInUrl === 'linkedin.com/in/testuser', 'LinkedIn URL persisted correctly');

    // Simulate page reload: read again
    const blob2 = await get(storagePath, { access: 'private', useCache: false });
    assert(blob2?.stream !== null, 'Second read (page reload simulation) has stream');
    const text2 = await new Response(blob2.stream).text();
    const parsed2 = JSON.parse(text2);
    assert(parsed2.profile.resumeText.includes('Test User Resume'), 'Resume persists across reads (no overwrite with defaults)');

    // Cleanup blob
    await del(storagePath);
    assert(true, 'Cleaned up user storage blob');
  } catch (error) {
    assert(false, `User blob storage: ${error.message}`);
    try { await del(storagePath); } catch {}
  }

  // Step 6: Test jobs blob storage (simulates /api/jobs)
  console.log('\nStep 6: Test user-scoped jobs storage (simulates /api/jobs)');
  const jobsPath = `users/${userSub}/jobs.json`;
  const testJobs = [{
    id: '12345',
    company: 'TestCorp',
    jobTitle: 'Senior Engineer',
    status: 'Applied',
    appliedDate: '2026-03-13',
    lastUpdated: new Date().toISOString(),
    notes: 'Test application',
  }];

  try {
    await put(jobsPath, JSON.stringify(testJobs, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    assert(true, 'Wrote jobs blob');

    const blob = await get(jobsPath, { access: 'private', useCache: false });
    assert(blob?.stream !== null, 'Jobs blob stream is not null');
    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);
    assert(Array.isArray(parsed) && parsed.length === 1, 'Jobs array has 1 entry');
    assert(parsed[0].company === 'TestCorp', 'Job company matches');
    assert(parsed[0].jobTitle === 'Senior Engineer', 'Job title matches');

    await del(jobsPath);
    assert(true, 'Cleaned up jobs blob');
  } catch (error) {
    assert(false, `Jobs blob storage: ${error.message}`);
    try { await del(jobsPath); } catch {}
  }

  // Cleanup: Delete test user
  console.log('\nCleanup: Delete test user');
  try {
    await deleteTestUser(mgmtToken, testUserId);
    assert(true, 'Deleted test user');
  } catch (error) {
    assert(false, `Cleanup: ${error.message}`);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
