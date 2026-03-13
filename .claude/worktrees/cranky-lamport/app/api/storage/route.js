import { del, get, put } from '@vercel/blob';
import { auth0 } from '../../../lib/auth0';

const STORAGE_VERSION = '1.0';
const STORAGE_BLOB_NAME = 'resume-data.json';

function getDefaultStorage() {
  return {
    version: STORAGE_VERSION,
    profile: null,
    savedApplications: [],
    learnedSkills: {},
    skillsSeeded: false,
  };
}

function getUserPath(userSub) {
  // NEVER use encodeURIComponent — @vercel/blob SDK handles encoding internally.
  // Pre-encoding causes double-encoding (%7C → %257C) which makes get() fail silently.
  return `users/${userSub}/${STORAGE_BLOB_NAME}`;
}

async function getSessionUser() {
  const session = await auth0.getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return null;
  }

  return userSub;
}

export async function GET() {
  const userSub = await getSessionUser();

  if (!userSub) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const path = getUserPath(userSub);

  // Try to load the blob. get() throws BlobNotFoundError for new users,
  // so we catch that specifically and return defaults.
  let blob;
  try {
    blob = await get(path, { access: 'private' });
  } catch (error) {
    // BlobNotFoundError or any fetch error — treat as "no data yet"
    console.log(`[storage] No blob at ${path} for user ${userSub} (${error.name || error.message}), returning defaults`);
    return Response.json(getDefaultStorage());
  }

  if (!blob || !blob.stream) {
    console.log(`[storage] No blob found at ${path} for user ${userSub}, returning defaults`);
    return Response.json(getDefaultStorage());
  }

  try {
    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);
    const skillCount = parsed?.learnedSkills ? Object.keys(parsed.learnedSkills).length : 0;
    const appCount = Array.isArray(parsed?.savedApplications) ? parsed.savedApplications.length : 0;
    console.log(`[storage] Loaded for ${userSub}: ${skillCount} skills, ${appCount} apps`);

    return Response.json({
      ...getDefaultStorage(),
      ...parsed,
      version: STORAGE_VERSION,
      savedApplications: Array.isArray(parsed?.savedApplications) ? parsed.savedApplications : [],
      learnedSkills: parsed?.learnedSkills && typeof parsed.learnedSkills === 'object' ? parsed.learnedSkills : {},
      skillsSeeded: Boolean(parsed?.skillsSeeded),
    });
  } catch (error) {
    console.error(`[storage] GET parse error:`, error);
    return Response.json({ error: error.message || 'Failed to load storage.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userSub = await getSessionUser();

    if (!userSub) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const payload = {
      ...getDefaultStorage(),
      ...body,
      version: STORAGE_VERSION,
      savedApplications: Array.isArray(body?.savedApplications) ? body.savedApplications : [],
      learnedSkills: body?.learnedSkills && typeof body.learnedSkills === 'object' ? body.learnedSkills : {},
      skillsSeeded: Boolean(body?.skillsSeeded),
    };

    const skillCount = Object.keys(payload.learnedSkills).length;
    const appCount = payload.savedApplications.length;
    console.log(`[storage] Saving for ${userSub}: ${skillCount} skills, ${appCount} apps`);

    await put(getUserPath(userSub), JSON.stringify(payload, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log(`[storage] Save successful for ${userSub}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(`[storage] PUT error:`, error);
    return Response.json({ error: error.message || 'Failed to save storage.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userSub = await getSessionUser();

    if (!userSub) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    await del(getUserPath(userSub));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to clear storage.' }, { status: 500 });
  }
}
