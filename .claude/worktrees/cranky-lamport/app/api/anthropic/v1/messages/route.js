export async function POST(request) {
  try {
    const body = await request.json();
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'Anthropic API key is not configured on the server.' }, { status: 500 });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await anthropicResponse.json();
    return Response.json(data, { status: anthropicResponse.status });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected server error' }, { status: 500 });
  }
}
