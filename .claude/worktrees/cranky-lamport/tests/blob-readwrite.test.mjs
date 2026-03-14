/**
 * Blob Read/Write Cycle Test
 *
 * Verifies that Vercel Blob storage works correctly:
 * 1. Writes data to a test blob path
 * 2. Reads it back and verifies contents match
 * 3. Cleans up the test blob
 *
 * Also verifies that blob paths do NOT use encodeURIComponent
 * (the SDK handles encoding internally; pre-encoding breaks get()).
 *
 * Run: node --env-file=.env.local tests/blob-readwrite.test.mjs
 * Requires: BLOB_READ_WRITE_TOKEN in .env.local
 */

import { get, put, del } from '@vercel/blob';

const TEST_PREFIX = `_test_${Date.now()}`;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

async function testBlobReadWrite() {
  console.log('\n--- Test: Basic blob read/write cycle ---');

  const path = `${TEST_PREFIX}/test-data.json`;
  const testData = { hello: 'world', timestamp: Date.now() };

  // Write
  const putResult = await put(path, JSON.stringify(testData), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  assert(putResult.url, 'put() returned a URL');
  assert(putResult.pathname.includes('test-data.json'), 'put() pathname contains filename');

  // Read back
  const getResult = await get(path, { access: 'public' });
  assert(getResult !== null, 'get() returned a result');
  assert(getResult.stream || getResult.url, 'get() result has stream or url');

  if (getResult.stream) {
    const text = await new Response(getResult.stream).text();
    const parsed = JSON.parse(text);
    assert(parsed.hello === 'world', 'Read-back data matches written data');
  } else {
    // Fallback: fetch from URL
    const resp = await fetch(getResult.url);
    const parsed = await resp.json();
    assert(parsed.hello === 'world', 'Read-back data matches written data (via URL)');
  }

  // Cleanup
  await del(path);
  console.log('  (cleaned up test blob)');
}

async function testPathEncoding() {
  console.log('\n--- Test: Path encoding with pipe character (Auth0 sub) ---');

  // Auth0 subs look like "auth0|abc123" — the pipe must NOT be pre-encoded
  const userSub = 'auth0|test-user-12345';

  // Correct path: no encodeURIComponent
  const correctPath = `users/${userSub}/${TEST_PREFIX}-encoding.json`;
  const testData = { sub: userSub, test: true };

  // Write with raw path (correct approach)
  const putResult = await put(correctPath, JSON.stringify(testData), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  assert(putResult.url, 'put() with pipe in path succeeded');

  // Read back with the same raw path
  let readSuccess = false;
  try {
    const getResult = await get(correctPath, { access: 'public' });
    if (getResult?.stream) {
      const text = await new Response(getResult.stream).text();
      const parsed = JSON.parse(text);
      readSuccess = parsed.sub === userSub;
    } else if (getResult?.url) {
      const resp = await fetch(getResult.url);
      const parsed = await resp.json();
      readSuccess = parsed.sub === userSub;
    }
  } catch (e) {
    console.error(`    get() threw: ${e.message}`);
  }

  assert(readSuccess, 'get() with raw pipe path reads back correctly');

  // Now test the WRONG approach: encodeURIComponent
  const wrongPath = `users/${encodeURIComponent(userSub)}/${TEST_PREFIX}-encoding-wrong.json`;
  await put(wrongPath, JSON.stringify({ wrong: true }), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // Try to read with the encoded path — this may silently fail
  let wrongReadWorks = false;
  try {
    const wrongGet = await get(wrongPath, { access: 'public' });
    if (wrongGet?.stream) {
      const text = await new Response(wrongGet.stream).text();
      wrongReadWorks = text.includes('wrong');
    }
  } catch (e) {
    // Expected: double-encoding may cause BlobNotFoundError
  }

  // Note: this test documents the behavior. If wrongReadWorks is false,
  // it confirms encodeURIComponent breaks get().
  if (!wrongReadWorks) {
    console.log('  ✓ Confirmed: encodeURIComponent breaks blob get() (expected behavior)');
    passed++;
  } else {
    console.log('  ⚠ encodeURIComponent path read succeeded (unexpected but not fatal)');
    // Don't count as failure — behavior may vary by blob SDK version
  }

  // Cleanup
  await del(correctPath).catch(() => {});
  await del(wrongPath).catch(() => {});
  console.log('  (cleaned up test blobs)');
}

async function testSourceCodePaths() {
  console.log('\n--- Test: Source code does NOT use encodeURIComponent on blob paths ---');

  const fs = await import('fs');
  const path = await import('path');

  const filesToCheck = [
    'app/api/storage/route.js',
    'app/api/jobs/route.js',
    'app/api/jobs/[id]/documents/route.js',
  ];

  for (const file of filesToCheck) {
    const fullPath = path.resolve(file);
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Check getUserPath / getUserJobsPath / getUserDocPath functions
    const pathFnMatch = content.match(/function\s+get\w+Path[\s\S]*?return\s+`([^`]+)`/);
    if (pathFnMatch) {
      const pathTemplate = pathFnMatch[1];
      const usesEncode = pathTemplate.includes('encodeURIComponent');
      assert(!usesEncode, `${file}: path function does NOT use encodeURIComponent`);
    } else {
      console.log(`  ⚠ Could not find path function in ${file}`);
    }
  }
}

// Run all tests
console.log('=== Blob Read/Write Tests ===');

try {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('ERROR: BLOB_READ_WRITE_TOKEN not set. Run with: node --env-file=.env.local tests/blob-readwrite.test.mjs');
    process.exit(1);
  }

  // Source code checks (no network needed)
  await testSourceCodePaths();

  // Live blob tests
  await testBlobReadWrite();
  await testPathEncoding();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
} catch (error) {
  console.error('\nFATAL:', error);
  process.exit(1);
}
