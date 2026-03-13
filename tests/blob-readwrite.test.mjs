/**
 * Tests the blob read/write cycle using get() with useCache:false.
 * This validates the fix for get() returning stream:null on 304.
 *
 * Run: node --env-file=.env.local tests/blob-readwrite.test.mjs
 */
import { put, get, del } from '@vercel/blob';

const TEST_PATH = 'tests/blob-readwrite-test.json';
const TEST_DATA = {
  profile: { resumeText: 'Test resume content', linkedInUrl: 'linkedin.com/in/test' },
  savedApplications: [],
  learnedSkills: { 'test question': 'test answer' },
  skillsSeeded: true,
};

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

async function runTests() {
  console.log('\n=== Blob Read/Write Test (useCache: false) ===\n');

  // Clean up any previous test data
  try { await del(TEST_PATH); } catch {}

  // Test 1: get() returns null stream for missing blob
  console.log('Test 1: Missing blob returns null stream');
  try {
    const blob = await get(TEST_PATH, { access: 'private', useCache: false });
    assert(!blob?.stream, 'Missing blob has no stream');
    console.log(`  (statusCode: ${blob?.statusCode})`);
  } catch (error) {
    // Some versions throw on missing blob, that's also acceptable
    assert(true, `get() threw for missing blob: ${error.constructor.name}`);
  }

  // Test 2: Write data with put()
  console.log('\nTest 2: Write data with put()');
  try {
    const result = await put(TEST_PATH, JSON.stringify(TEST_DATA, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    assert(result.url && result.url.length > 0, 'put() returns a URL');
    console.log(`  (stored at: ${result.pathname})`);
  } catch (error) {
    assert(false, `put() failed: ${error.message}`);
  }

  // Test 3: Read back with get() useCache:false (first read)
  console.log('\nTest 3: First read with get(useCache:false)');
  try {
    const blob = await get(TEST_PATH, { access: 'private', useCache: false });
    assert(blob?.statusCode === 200, `statusCode is 200 (got ${blob?.statusCode})`);
    assert(blob?.stream !== null, 'stream is not null');

    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);
    assert(parsed.profile.resumeText === 'Test resume content', 'Profile resumeText matches');
    assert(parsed.profile.linkedInUrl === 'linkedin.com/in/test', 'Profile linkedInUrl matches');
    assert(parsed.learnedSkills['test question'] === 'test answer', 'Learned skills match');
    assert(parsed.skillsSeeded === true, 'skillsSeeded matches');
  } catch (error) {
    assert(false, `Read failed: ${error.message}`);
  }

  // Test 4: Read again immediately (would be 304 without useCache:false)
  console.log('\nTest 4: Second read (validates no caching)');
  try {
    const blob = await get(TEST_PATH, { access: 'private', useCache: false });
    assert(blob?.statusCode === 200, `statusCode is 200 (got ${blob?.statusCode})`);
    assert(blob?.stream !== null, 'stream is not null on second read');
    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);
    assert(parsed.profile.resumeText === 'Test resume content', 'Second read returns correct data');
  } catch (error) {
    assert(false, `Second read failed: ${error.message}`);
  }

  // Test 5: Overwrite and read back
  console.log('\nTest 5: Overwrite and read back');
  const UPDATED_DATA = { ...TEST_DATA, profile: { resumeText: 'Updated resume', linkedInUrl: '' } };
  try {
    await put(TEST_PATH, JSON.stringify(UPDATED_DATA, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    const blob = await get(TEST_PATH, { access: 'private', useCache: false });
    assert(blob?.stream !== null, 'stream exists after overwrite');
    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);
    assert(parsed.profile.resumeText === 'Updated resume', 'Overwritten data reads back correctly');
  } catch (error) {
    assert(false, `Overwrite test failed: ${error.message}`);
  }

  // Cleanup
  try { await del(TEST_PATH); } catch {}

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
