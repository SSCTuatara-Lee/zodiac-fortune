export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { zodiacIndex, birthday, message } = body;
  if (typeof zodiacIndex !== 'number' || !birthday || !message) {
    return new Response(JSON.stringify({ error: 'Missing zodiacIndex, birthday or message.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const apiKey = env.DEESEEK_API_KEY || env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DeepSeek API key is not configured.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const apiUrl = env.DEESEEK_BASE_URL || 'https://api.deepseek.com';
  const prompt =
    `你是一名中文星座运势专家。根据用户的生日和星座索引提供专业运势咨询。不要输出 JSON，仅返回自然语言回答。` +
    `\n星座索引: ${zodiacIndex}` +
    `\n生日: ${birthday}` +
    `\n用户问题: ${message}` +
    `\n回答应简洁、有洞察力，并给出实际建议。`;

  let apiResponse;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        instructions: '你是一名专业的中文星座运势顾问。请用简洁自然的中文回答。',
        input: prompt,
        temperature: 0.9,
        max_output_tokens: 350,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return new Response(
        JSON.stringify({ error: `DeepSeek API error ${res.status}.`, details: errorText }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    apiResponse = await res.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'DeepSeek request failed.', details: error.message }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  const rawOutput =
    apiResponse.output_text ||
    apiResponse.response?.output_text ||
    (Array.isArray(apiResponse.output)
      ? apiResponse.output.map((item) => item.content || '').join('')
      : '') ||
    (Array.isArray(apiResponse.response?.output)
      ? apiResponse.response.output.map((item) => item.content || '').join('')
      : '');

  if (!rawOutput) {
    return new Response(
      JSON.stringify({ error: 'DeepSeek response did not contain output_text.', apiResponse }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({ answer: rawOutput.trim() }), {
    headers: { 'content-type': 'application/json' },
  });
}
