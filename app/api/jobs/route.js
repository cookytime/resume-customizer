import { get, put } from '@vercel/blob';
import { auth0 } from '../../../lib/auth0';

const JOBS_BLOB_NAME = 'jobs.json';

function getUserJobsPath(userSub) {
  return `users/${userSub}/${JOBS_BLOB_NAME}`;
}

async function getSessionUser() {
  const session = await auth0.getSession();
  const userSub = session?.user?.sub;
  if (!userSub) return null;
  return userSub;
}

async function loadJobs(userSub) {
  try {
    const blob = await get(getUserJobsPath(userSub), { access: 'private', useCache: false });
    if (!blob?.stream) return [];
    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveJobs(userSub, jobs) {
  await put(getUserJobsPath(userSub), JSON.stringify(jobs, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// GET /api/jobs — list all jobs
export async function GET() {
  try {
    const userSub = await getSessionUser();
    if (!userSub) return Response.json({ error: 'Authentication required.' }, { status: 401 });
    const jobs = await loadJobs(userSub);
    return Response.json(jobs);
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to load jobs.' }, { status: 500 });
  }
}

// POST /api/jobs — create a new job record
export async function POST(request) {
  try {
    const userSub = await getSessionUser();
    if (!userSub) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json();
    const jobs = await loadJobs(userSub);

    // Duplicate detection: same company + job title (case-insensitive)
    const isDuplicate = jobs.some(
      j =>
        j.company?.toLowerCase().trim() === body.company?.toLowerCase().trim() &&
        j.jobTitle?.toLowerCase().trim() === body.jobTitle?.toLowerCase().trim() &&
        j.status !== 'Withdrawn'
    );

    if (isDuplicate) {
      return Response.json({ error: 'duplicate', message: 'A job with this company and title already exists.' }, { status: 409 });
    }

    const newJob = {
      id: String(Date.now()),
      company: body.company || '',
      jobTitle: body.jobTitle || '',
      status: body.status || 'Applied',
      appliedDate: body.appliedDate || new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      notes: body.notes || '',
      resumeKey: body.resumeKey || null,
      coverLetterKey: body.coverLetterKey || null,
      jobDescriptionSnippet: body.jobDescriptionSnippet || '',
      keyPhrases: body.keyPhrases || [],
    };

    jobs.unshift(newJob);
    await saveJobs(userSub, jobs);
    return Response.json(newJob, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to create job.' }, { status: 500 });
  }
}

// PUT /api/jobs — update an existing job record
export async function PUT(request) {
  try {
    const userSub = await getSessionUser();
    if (!userSub) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json();
    if (!body.id) return Response.json({ error: 'Job ID required.' }, { status: 400 });

    const jobs = await loadJobs(userSub);
    const idx = jobs.findIndex(j => j.id === body.id);
    if (idx === -1) return Response.json({ error: 'Job not found.' }, { status: 404 });

    jobs[idx] = {
      ...jobs[idx],
      ...body,
      lastUpdated: new Date().toISOString(),
    };

    await saveJobs(userSub, jobs);
    return Response.json(jobs[idx]);
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to update job.' }, { status: 500 });
  }
}

// DELETE /api/jobs?id=xxx — remove a job record
export async function DELETE(request) {
  try {
    const userSub = await getSessionUser();
    if (!userSub) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'Job ID required.' }, { status: 400 });

    const jobs = await loadJobs(userSub);
    const filtered = jobs.filter(j => j.id !== id);
    await saveJobs(userSub, filtered);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to delete job.' }, { status: 500 });
  }
}
