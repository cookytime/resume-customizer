/**
 * Debug get() behavior with user-scoped paths.
 * Run: node --env-file=.env.local tests/debug-blob-get.mjs
 */
import { put, get, del } from '@vercel/blob';

const TEST_PATH = 'users/auth0%7Ctestuser123/resume-data.json';
const DATA = JSON.stringify({ profile: { resumeText: 'test' } });

async function main() {
  // Clean
  try { await del(TEST_PATH); } catch {}

  // Write
  await put(TEST_PATH, DATA, {
    access: 'private', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true,
  });
  console.log('Written to:', TEST_PATH);

  // Read 1
  const r1 = await get(TEST_PATH, { access: 'private', useCache: false });
  console.log('\nRead 1:');
  console.log('  statusCode:', r1?.statusCode);
  console.log('  stream:', r1?.stream === null ? 'NULL' : typeof r1?.stream);
  console.log('  keys:', Object.keys(r1 || {}));
  if (r1?.stream) {
    const t = await new Response(r1.stream).text();
    console.log('  content:', t);
  }

  // Read 2 immediately
  const r2 = await get(TEST_PATH, { access: 'private', useCache: false });
  console.log('\nRead 2:');
  console.log('  statusCode:', r2?.statusCode);
  console.log('  stream:', r2?.stream === null ? 'NULL' : typeof r2?.stream);
  if (r2?.stream) {
    const t = await new Response(r2.stream).text();
    console.log('  content:', t);
  }

  // Read 3 - without useCache
  const r3 = await get(TEST_PATH, { access: 'private' });
  console.log('\nRead 3 (no useCache):');
  console.log('  statusCode:', r3?.statusCode);
  console.log('  stream:', r3?.stream === null ? 'NULL' : typeof r3?.stream);
  if (r3?.stream) {
    const t = await new Response(r3.stream).text();
    console.log('  content:', t);
  }

  // Clean
  await del(TEST_PATH);
}

main().catch(e => console.error(e));
