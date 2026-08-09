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

  const { zodiacIndex, birthday } = body;
  if (typeof zodiacIndex !== 'number' || !birthday) {
    return new Response(JSON.stringify({ error: 'Missing zodiacIndex or birthday.' }), {
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

  const model = 'deepseek-v4-flash';
  const prompt = `你是一名中文星座运势专家，需要为星座用户生成当天真实且专业的运势解读。请基于用户的星座和生日，输出一个 JSON 对象。不要包含任何多余说明，也不要输出非 JSON 文本。返回字段如下：overall, love, career, wealth, health, tarotName, tarotMeaning, luckyNumber, luckyColor, luckyZodiac, luckyStone, goldenTime, motto。` +
    `\n星座索引: ${zodiacIndex}` +
    `\n生日: ${birthday}` +
    `\n要求：内容应富有星象学和占星分析感，兼顾实用建议和情绪提示。每个字段文字控制在 15-40 个汉字。`;

  const apiUrl = env.DEESEEK_BASE_URL || 'https://api.deepseek.com/v1/responses';

  let apiResponse;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: '你是一个专业的中文星座运势写手。请根据 input 生成符合字段要求的 JSON。',
        input: prompt,
        temperature: 0.9,
        max_output_tokens: 450,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return new Response(JSON.stringify({ error: `DeepSeek API error ${res.status}.`, details: errorText }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }

    apiResponse = await res.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'DeepSeek request failed.', details: error.message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rawOutput = apiResponse.output_text || apiResponse.response?.output_text ||
    (Array.isArray(apiResponse.output) ? apiResponse.output.map(item => item.content || '').join('') : '');

  if (!rawOutput) {
    return new Response(JSON.stringify({ error: 'DeepSeek response did not contain output_text.' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const parsed = JSON.parse(rawOutput);
    return new Response(JSON.stringify({ data: parsed }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to parse DeepSeek response as JSON.', rawOutput }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}
