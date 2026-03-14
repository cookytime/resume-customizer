export async function POST(request) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return Response.json({ requirements: null });
    }

    // Ollama is opt-in via ENABLE_OLLAMA=true
    if (process.env.ENABLE_OLLAMA !== 'true') {
      return Response.json({ requirements: null });
    }

    const baseUrl = process.env.OLLAMA_BASE_URL;
    const apiKey = process.env.OLLAMA_API_KEY;

    if (!baseUrl) {
      return Response.json({ requirements: null });
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const ollamaResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: `Extract the 10 most important technical requirements from this job description. Return ONLY a valid JSON array of strings, no explanation, no markdown. Example: ["requirement 1", "requirement 2"]\n\nJob description:\n${jobDescription}`,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      return Response.json({ requirements: null });
    }

    const data = await ollamaResponse.json();
    const text = data.response || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return Response.json({ requirements: null });
    }

const requirements = JSON.parse(match[0]);
    if (!Array.isArray(requirements)) {
      return Response.json({ requirements: null });
    }

    // Handle both flat strings and object format from larger models
    const normalized = requirements.map(item =>
      typeof item === 'string' ? item : `${item.requirement}: ${item.description}`
    );

    return Response.json({ requirements: normalized });
  } catch {
    return Response.json({ requirements: null });
  }
}
