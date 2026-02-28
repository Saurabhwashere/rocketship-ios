import { NextResponse } from 'next/server';
import { extractJSON } from '../utils';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

function mistralHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior iOS architect specialising in SwiftUI and Swift 5.9+.
Given a plain-English app description and optional clarification answers, produce a
structured JSON blueprint for a native iOS app.

RULES you MUST follow:
- Use SwiftUI for ALL UI (no UIKit)
- Use @Observable macro (iOS 17+) for state management
- Use NavigationStack (never NavigationView) for navigation
- Use Swift Concurrency (async/await) for any async operations
- Keep the app buildable: no third-party packages
- Minimum 2 screens, maximum 6 screens
- bundleId: com.rocketship.<appname_lowercase_no_spaces>

Return ONLY valid JSON matching this EXACT schema — no explanation, no markdown:
{
  "appName": "string (short display name)",
  "bundleId": "com.rocketship.<slug>",
  "deploymentTarget": "17.0",
  "navigationStyle": "tab" | "stack" | "split",
  "screens": [
    {
      "name": "string (PascalCase SwiftUI View name, e.g. HomeView)",
      "purpose": "string (one sentence)",
      "swiftUIViews": ["ViewName1", "ViewName2"]
    }
  ],
  "dataModels": [
    {
      "name": "string (e.g. TodoItem)",
      "properties": [
        { "name": "string", "type": "Swift type string e.g. String, Int, Bool, Date, [String]" }
      ]
    }
  ],
  "estimatedFiles": number
}`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { description, answers = [] } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    const userLines = [`App description: ${description}`];
    if (answers.length > 0) {
      userLines.push('', 'Additional preferences:', ...answers.map((a, i) => `${i + 1}. ${a}`));
    }

    const res = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: mistralHeaders(),
      body: JSON.stringify({
        model: 'codestral-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userLines.join('\n') },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Mistral API error (${res.status})`);
    }

    const data = await res.json();
    const raw = data.choices[0].message.content;
    const parsed = extractJSON(raw);

    if (!parsed) {
      console.error('ArchitectAgent — raw output (parse failed):\n', raw.slice(0, 600));
      throw new Error('Codestral returned invalid JSON blueprint. Please try again.');
    }

    if (!parsed.appName || !Array.isArray(parsed.screens) || !parsed.dataModels) {
      console.error('ArchitectAgent — incomplete blueprint:', parsed);
      throw new Error('Blueprint is missing required fields (appName, screens, or dataModels).');
    }

    parsed.estimatedFiles = Number(parsed.estimatedFiles) || parsed.screens.length + parsed.dataModels.length + 1;

    return NextResponse.json({ blueprint: parsed });

  } catch (error) {
    console.error('ArchitectAgent error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate blueprint' },
      { status: 500 }
    );
  }
}
