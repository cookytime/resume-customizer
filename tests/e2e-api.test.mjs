/**
 * End-to-End API Test
 *
 * Tests the full flow: Auth0 session → storage CRUD → jobs CRUD
 * Requires a running Next.js server and valid Auth0 session cookie.
 *
 * Run: node --env-file=.env.local tests/e2e-api.test.mjs
 *
 * Before running:
 * 1. Start dev server: npm run dev
 * 2. Log in via browser to get a session cookie
 * 3. Set TEST_SESSION_COOKIE env var (or the test will try unauthenticated)
 */

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const SESSION_COOKIE = process.env.TEST_SESSION_COOKIE || '';

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function skip(message) {
  console.log(`  ⊘ SKIP: ${message}`);
  skipped++;
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(SESSION_COOKIE ? { Cookie: SESSION_COOKIE } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  });

  return res;
}

// --- Health checks ---
async function testHealthChecks() {
  console.log('\n--- Test: Page health checks ---');

  for (const path of ['/', '/login', '/dashboard']) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
      // 200 = OK, 302/307 = redirect to login (expected for auth-protected pages)
      const ok = res.status === 200 || res.status === 302 || res.status === 307;
      assert(ok, `GET ${path} → ${res.status} (${ok ? 'OK' : 'FAIL'})`);
    } catch (e) {
      assert(false, `GET ${path} → NETWORK ERROR: ${e.message}`);
    }
  }
}

// --- Storage API ---
async function testStorageAPI() {
  console.log('\n--- Test: Storage API (/api/storage) ---');

  if (!SESSION_COOKIE) {
    skip('No TEST_SESSION_COOKIE — cannot test authenticated endpoints');
    return;
  }

  // GET — should return defaults or existing data
  const getRes = await api('/api/storage');
  assert(getRes.status === 200, `GET /api/storage → ${getRes.status}`);

  const getData = await getRes.json();
  assert(getData.version !== undefined, 'Response has version field');
  assert(Array.isArray(getData.savedApplications), 'Response has savedApplications array');
  assert(typeof getData.learnedSkills === 'object', 'Response has learnedSkills object');

  // PUT — save test data
  const testProfile = {
    ...getData,
    profile: {
      resumeText: `TEST RESUME - ${Date.now()}`,
      linkedInUrl: 'https://linkedin.com/in/test',
    },
  };

  const putRes = await api('/api/storage', {
    method: 'PUT',
    body: JSON.stringify(testProfile),
  });
  assert(putRes.status === 200, `PUT /api/storage → ${putRes.status}`);

  // GET again — verify persistence
  const getRes2 = await api('/api/storage');
  const getData2 = await getRes2.json();
  assert(
    getData2.profile?.resumeText === testProfile.profile.resumeText,
    'Profile data persisted across GET → PUT → GET cycle'
  );

  // Restore original data
  if (getData.profile) {
    await api('/api/storage', {
      method: 'PUT',
      body: JSON.stringify(getData),
    });
    console.log('  (restored original storage data)');
  }
}

// --- Jobs API ---
async function testJobsAPI() {
  console.log('\n--- Test: Jobs API (/api/jobs) ---');

  if (!SESSION_COOKIE) {
    skip('No TEST_SESSION_COOKIE — cannot test authenticated endpoints');
    return;
  }

  // GET — list jobs
  const listRes = await api('/api/jobs');
  assert(listRes.status === 200, `GET /api/jobs → ${listRes.status}`);

  const jobs = await listRes.json();
  assert(Array.isArray(jobs), 'Response is an array');

  // POST — create test job
  const testJob = {
    company: `TestCorp-${Date.now()}`,
    jobTitle: 'Test Engineer',
    status: 'Applied',
    appliedDate: '2025-01-01',
    notes: 'E2E test job — safe to delete',
    keyPhrases: ['testing', 'automation'],
    jobDescriptionSnippet: 'This is a test job posting.',
  };

  const createRes = await api('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(testJob),
  });
  assert(createRes.status === 201, `POST /api/jobs → ${createRes.status}`);

  const createdJob = await createRes.json();
  assert(createdJob.id, 'Created job has an ID');
  assert(createdJob.company === testJob.company, 'Created job has correct company');
  assert(createdJob.jobTitle === testJob.jobTitle, 'Created job has correct title');

  // GET — verify job appears in list
  const listRes2 = await api('/api/jobs');
  const jobs2 = await listRes2.json();
  const found = jobs2.find(j => j.id === createdJob.id);
  assert(found, 'Created job appears in job list (persistence works)');

  // PUT — update job status
  const updateRes = await api('/api/jobs', {
    method: 'PUT',
    body: JSON.stringify({ id: createdJob.id, status: 'Interview' }),
  });
  assert(updateRes.status === 200, `PUT /api/jobs → ${updateRes.status}`);

  const updatedJob = await updateRes.json();
  assert(updatedJob.status === 'Interview', 'Job status updated correctly');

  // Duplicate detection
  const dupRes = await api('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(testJob),
  });
  assert(dupRes.status === 409, `Duplicate POST → ${dupRes.status} (409 expected)`);

  // DELETE — cleanup
  const delRes = await api(`/api/jobs?id=${createdJob.id}`, { method: 'DELETE' });
  assert(delRes.status === 200, `DELETE /api/jobs → ${delRes.status}`);

  // Verify deletion
  const listRes3 = await api('/api/jobs');
  const jobs3 = await listRes3.json();
  const stillExists = jobs3.find(j => j.id === createdJob.id);
  assert(!stillExists, 'Deleted job no longer in list');
}

// --- Unauthenticated access ---
async function testUnauthenticatedAccess() {
  console.log('\n--- Test: Unauthenticated API access returns 401 ---');

  for (const path of ['/api/storage', '/api/jobs']) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    // Should get 401 or redirect (302/307) depending on middleware
    const blocked = res.status === 401 || res.status === 302 || res.status === 307;
    assert(blocked, `GET ${path} without auth → ${res.status} (blocked: ${blocked})`);
  }
}

// --- Source code checks ---
async function testSourceCodeIntegrity() {
  console.log('\n--- Test: Source code integrity checks ---');

  const fs = await import('fs');

  const filesToCheck = [
    'app/api/storage/route.js',
    'app/api/jobs/route.js',
    'app/api/jobs/[id]/documents/route.js',
  ];

  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Check no encodeURIComponent in path functions
      const pathFnMatch = content.match(/function\s+get\w+Path[\s\S]*?\{[\s\S]*?return\s+`([^`]+)`/);
      if (pathFnMatch) {
        const usesEncode = pathFnMatch[0].includes('encodeURIComponent');
        assert(!usesEncode, `${file}: No encodeURIComponent in path function`);
      }
    } catch (e) {
      assert(false, `${file}: Could not read file — ${e.message}`);
    }
  }
}

// Run all tests
console.log('=== End-to-End API Tests ===');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Session cookie: ${SESSION_COOKIE ? 'provided' : 'NOT SET (authenticated tests will be skipped)'}`);

try {
  await testSourceCodeIntegrity();

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/`, { redirect: 'manual' });
  } catch (e) {
    console.error(`\nERROR: Cannot reach ${BASE_URL}. Start the dev server first: npm run dev`);
    // Still run source code checks
    console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${skipped} skipped ===`);
    process.exit(failed > 0 ? 1 : 0);
  }

  await testHealthChecks();
  await testUnauthenticatedAccess();
  await testStorageAPI();
  await testJobsAPI();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${skipped} skipped ===`);
  process.exit(failed > 0 ? 1 : 0);
} catch (error) {
  console.error('\nFATAL:', error);
  process.exit(1);
}
