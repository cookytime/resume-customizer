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
  return `users/${encodeURIComponent(userSub)}/${STORAGE_BLOB_NAME}`;
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
  try {
    const userSub = await getSessionUser();

    if (!userSub) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const blob = await get(getUserPath(userSub), { access: 'private' });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return Response.json(getDefaultStorage());
    }

    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);

    return Response.json({
      ...getDefaultStorage(),
      ...parsed,
      version: STORAGE_VERSION,
      savedApplications: Array.isArray(parsed?.savedApplications) ? parsed.savedApplications : [],
      learnedSkills: parsed?.learnedSkills && typeof parsed.learnedSkills === 'object' ? parsed.learnedSkills : {},
      skillsSeeded: Boolean(parsed?.skillsSeeded),
    });
  } catch (error) {
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

    await put(getUserPath(userSub), JSON.stringify(payload, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return Response.json({ ok: true });
  } catch (error) {
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
