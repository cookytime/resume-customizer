/**
 * Debug: does get() fail with URL-encoded paths?
 * Run: node --env-file=.env.local tests/debug-blob-encoding.mjs
 */
import { put, get, del, head, BlobNotFoundError } from '@vercel/blob';

async function testPath(label, path) {
  console.log(`\n--- ${label}: "${path}" ---`);
  try { await del(path); } catch {}

  await put(path, JSON.stringify({ test: true }), {
    access: 'private', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true,
  });

  // Test get()
  const blob = await get(path, { access: 'private', useCache: false });
  console.log('  get() keys:', Object.keys(blob || {}));
  console.log('  get() stream:', blob?.stream === null ? 'NULL' : blob?.stream === undefined ? 'UNDEFINED' : 'EXISTS');
  if (blob?.stream) {
    console.log('  get() content:', await new Response(blob.stream).text());
  }

  // Test head()
  try {
    const meta = await head(path, { access: 'private' });
    console.log('  head() url:', meta?.url?.substring(0, 80) + '...');
    console.log('  head() downloadUrl:', meta?.downloadUrl?.substring(0, 80) + '...');
  } catch (e) {
    console.log('  head() error:', e.message);
  }

  try { await del(path); } catch {}
}

async function main() {
  await testPath('Simple path', 'tests/simple-test.json');
  await testPath('Encoded pipe', 'users/auth0%7Ctestuser/data.json');
  await testPath('Raw pipe', 'users/auth0|testuser/data.json');
  await testPath('No special chars', 'users/auth0_testuser/data.json');
}

main().catch(e => console.error(e));
