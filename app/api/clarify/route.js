import { NextResponse } from 'next/server';
import { extractJSON } from '../utils';

const SYSTEM_PROMPT = `You are a product manager deciding whether to ask clarifying questions before building an app.

You will receive:
- The current app description
- Previous prompts the user has sent (earlier sessions)
- A Q&A history of questions already asked and answered

STEP 1 — Sufficiency check:
Decide if you already have enough context to build a good app WITHOUT asking more questions.

Mark sufficient=true (skip questions) if ANY of these are true:
- The previous Q&A history already covers audience, features, and style
- This appears to be an iteration/update prompt (e.g. "add dark mode", "make it faster", "change the color")
- The prompt is already detailed enough (mentions specific screens, features, or design preferences)
- There is prior Q&A history with 2+ answered questions

Mark sufficient=false (ask questions) only if:
- This is a brand-new app idea with NO prior context
- The prompt is very vague (1-3 words, no feature details) AND there is no Q&A history

STEP 2 — If not sufficient, generate ONLY questions that fill genuine gaps:
- NEVER ask about something already covered in Q&A history
- Ask at most 3 questions, possibly fewer if partial context exists
- Cover only the dimensions that are still unknown among: audience, core feature, visual style
- Questions must be short and conversational (max 10 words)
- Do NOT ask about platform (always iOS) or tech stack

Return ONLY this JSON:
{
  "sufficient": true | false,
  "questions": [
    { "id": "q1", "text": "..." }
  ]
}

If sufficient=true, return an empty questions array: "questions": []`;

export async function POST(request) {
  try {
    const { prompt, previousPrompts = [], qaHistory = [] } = await request.json();
    if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });

    // Build context summary for the model
    const contextParts = [];

    if (previousPrompts.length > 0) {
      contextParts.push(`Previous app prompts from this user:\n${previousPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
    }

    if (qaHistory.length > 0) {
      const historyText = qaHistory.map(item => `Q: ${item.question}\nA: ${item.answer}`).join('\n\n');
      contextParts.push(`Prior Q&A history (already answered — do NOT repeat these):\n${historyText}`);
    }

    const contextBlock = contextParts.length > 0
      ? `\n\n--- EXISTING CONTEXT ---\n${contextParts.join('\n\n')}\n--- END CONTEXT ---`
      : '';

    const userMessage = `Current app description: ${prompt}${contextBlock}`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Mistral API error');
    }

    const data = await res.json();
    const parsed = extractJSON(data.choices[0].message.content);

    if (!parsed || typeof parsed.sufficient !== 'boolean') {
      throw new Error('Invalid response from clarify model');
    }

    // Normalise: if sufficient, ensure questions is empty
    const questions = parsed.sufficient ? [] : (Array.isArray(parsed.questions) ? parsed.questions : []);

    return NextResponse.json({ sufficient: parsed.sufficient, questions });
  } catch (err) {
    console.error('[clarify]', err);
    // On error, treat as sufficient so we don't block the build
    return NextResponse.json({ sufficient: true, questions: [] });
  }
}
