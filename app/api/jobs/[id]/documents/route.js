import { get, put } from '@vercel/blob';
import { auth0 } from '../../../../../lib/auth0';

function getUserDocPath(userSub, jobId, docType) {
  return `users/${encodeURIComponent(userSub)}/jobs/${jobId}/${docType}.md`;
}

async function getSessionUser() {
  const session = await auth0.getSession();
  const userSub = session?.user?.sub;
  if (!userSub) return null;
  return userSub;
}

// PUT /api/jobs/[id]/documents — save resume or cover letter markdown
export async function PUT(request, { params }) {
  try {
    const userSub = await getSessionUser();
    if (!userSub) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const result = {};

    if (body.resume) {
      const resumePath = getUserDocPath(userSub, id, 'resume');
      await put(resumePath, body.resume, {
        access: 'private',
        contentType: 'text/markdown',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      result.resumeKey = resumePath;
    }

    if (body.coverLetter) {
      const coverPath = getUserDocPath(userSub, id, 'cover-letter');
      await put(coverPath, body.coverLetter, {
        access: 'private',
        contentType: 'text/markdown',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      result.coverLetterKey = coverPath;
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to save document.' }, { status: 500 });
  }
}

// GET /api/jobs/[id]/documents?type=resume — retrieve saved document
export async function GET(request, { params }) {
  try {
    const userSub = await getSessionUser();
    if (!userSub) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('type') || 'resume';

    const docPath = getUserDocPath(userSub, id, docType);
    const blob = await get(docPath, { access: 'private' });

    if (!blob?.stream) {
      return Response.json({ error: 'Document not found.' }, { status: 404 });
    }

    const text = await new Response(blob.stream).text();
    return Response.json({ content: text, key: docPath });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to load document.' }, { status: 500 });
  }
}
