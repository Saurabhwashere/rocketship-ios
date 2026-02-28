const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

function mistralHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
  };
}

// ─── Swift code generation system prompt ─────────────────────────────────────

const SWIFT_SYSTEM = `You are an expert Swift/SwiftUI engineer. Generate production-quality,
compilable Swift 5.9 code for iOS 17+.

Rules you MUST follow:
- Every View file must end with a #Preview macro
- Use @Observable class (NOT ObservableObject / @StateObject / @Published)
- Use NavigationStack / navigationDestination (NEVER NavigationView)
- Use .task modifier for async work (NEVER DispatchQueue)
- Use Swift structured concurrency (async/await) everywhere
- No force unwraps (!). Use guard let or if let
- SF Symbols only for icons — no external image assets
- Return ONLY the Swift code. No markdown code blocks. No explanation.`;

// ─── SSE helpers ─────────────────────────────────────────────────────────────

function sseEvent(controller, encoder, payload) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

// ─── Stream a single Swift file from Codestral ───────────────────────────────

async function generateSwiftFile({ controller, encoder, filename, role, prompt }) {
  sseEvent(controller, encoder, { type: 'file_start', filename, role });

  const res = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: mistralHeaders(),
    body: JSON.stringify({
      model: 'codestral-latest',
      messages: [
        { role: 'system', content: SWIFT_SYSTEM },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Codestral API error (${res.status})`);
  }

  let fullContent = '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') break;
      try {
        const event = JSON.parse(raw);
        const text = event.choices?.[0]?.delta?.content ?? '';
        if (text) {
          fullContent += text;
          sseEvent(controller, encoder, { type: 'file_chunk', filename, chunk: text });
        }
      } catch { /* skip malformed chunk */ }
    }
  }

  sseEvent(controller, encoder, { type: 'file_done', filename, role, content: fullContent });
  return { filename, content: fullContent, role };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { blueprint } = await request.json();

        if (!blueprint) {
          sseEvent(controller, encoder, { type: 'error', message: 'blueprint is required' });
          controller.close();
          return;
        }

        const files = [];
        const appName = blueprint.appName.replace(/\s+/g, '');

        const modelsList = blueprint.dataModels.map(m =>
          `${m.name}: { ${m.properties.map(p => `${p.name}: ${p.type}`).join(', ')} }`
        ).join('\n');

        // ── agent: architect (already done, just echo) ────────────────────────
        sseEvent(controller, encoder, {
          type: 'agent', agent: 'architect', status: 'done',
          detail: `${blueprint.screens.length} screens · ${blueprint.navigationStyle} nav`,
          blueprint,
        });

        sseEvent(controller, encoder, {
          type: 'agent', agent: 'coder', status: 'running', detail: 'Writing Swift files…',
        });

        // ── CALL 1: App entry point ───────────────────────────────────────────
        const entryFilename = `${appName}App.swift`;
        const navRoot = blueprint.navigationStyle === 'tab'
          ? `TabView {\n              ${blueprint.screens.map(s =>
              `${s.name}()\n                .tabItem { Label("${s.name.replace('View', '')}", systemImage: "circle") }`
            ).join('\n              ')}\n            }`
          : `NavigationStack {\n              ${blueprint.screens[0].name}()\n            }`;

        const entryFile = await generateSwiftFile({
          controller, encoder,
          filename: entryFilename, role: 'app',
          prompt: `Generate the @main App entry point file for a SwiftUI app called "${blueprint.appName}".
Bundle ID: ${blueprint.bundleId}
Deployment target: iOS ${blueprint.deploymentTarget}
Navigation style: ${blueprint.navigationStyle}

The root view should be:
${navRoot}

Import SwiftUI. Name the struct ${appName}App and conform to App.
Use WindowGroup as the Scene.
At the end include: #Preview { ${blueprint.screens[0].name}() }`,
        });
        files.push(entryFile);

        // ── CALL 2: Data models ───────────────────────────────────────────────
        if (blueprint.dataModels.length > 0) {
          const modelsFile = await generateSwiftFile({
            controller, encoder,
            filename: 'Models.swift', role: 'model',
            prompt: `Generate a Models.swift file for a SwiftUI app called "${blueprint.appName}".

Create these Swift data models:
${modelsList}

For each model:
- Use struct + Identifiable + Codable
- Add a UUID id property
- Include a static var sampleData: [ModelName] with 3-5 realistic example items

Also create an @Observable class called AppStore that:
- Holds an array of each model type
- Initialises with the sampleData
- Has add/delete/update methods appropriate to the app

End the file with:
#Preview {
    Text("Models Preview")
        .environment(AppStore())
}`,
          });
          files.push(modelsFile);
        }

        // ── CALL 3: Each screen view ──────────────────────────────────────────
        for (const screen of blueprint.screens) {
          const otherScreens = blueprint.screens
            .filter(s => s.name !== screen.name).map(s => s.name).join(', ');

          const screenFile = await generateSwiftFile({
            controller, encoder,
            filename: `${screen.name}.swift`, role: 'view',
            prompt: `Generate the SwiftUI View file for "${screen.name}" in the "${blueprint.appName}" app.

Screen purpose: ${screen.purpose}
Navigation style: ${blueprint.navigationStyle}
Other screens in the app: ${otherScreens || 'none'}
Data models available: ${modelsList || 'none'}

Requirements:
- Import SwiftUI
- Receive AppStore via @Environment(AppStore.self) var store
- Use iOS 17 SwiftUI patterns (@Observable, NavigationStack, .navigationTitle, toolbar)
- Use SF Symbols for all icons
- Make the UI complete and polished — not a skeleton
- End with a #Preview macro that injects AppStore() via .environment

Generate ONLY this one file.`,
          });
          files.push(screenFile);
        }

        // ── reviewer: deterministic checks ───────────────────────────────────
        sseEvent(controller, encoder, {
          type: 'agent', agent: 'reviewer', status: 'running', detail: 'Checking Swift 5.9 compatibility…',
        });

        const issues = files.filter(f =>
          (f.role === 'view' && !f.content.includes('#Preview')) ||
          f.content.includes('NavigationView') ||
          f.content.includes('ObservableObject')
        );

        sseEvent(controller, encoder, {
          type: 'agent', agent: 'reviewer',
          status: issues.length > 0 ? 'error' : 'done',
          detail: issues.length > 0
            ? `${issues.length} issue(s) found`
            : `${files.length} files validated`,
          filesGenerated: files.map(f => f.filename),
        });

        sseEvent(controller, encoder, {
          type: 'agent', agent: 'coder', status: 'done',
          detail: `${files.length} Swift files written`,
          filesGenerated: files.map(f => f.filename),
        });

        // ── deployer ──────────────────────────────────────────────────────────
        // Appetize requires a compiled .app binary — source code cannot be run
        // directly. The project is packaged as a downloadable .xcodeproj zip.
        sseEvent(controller, encoder, {
          type: 'agent', agent: 'deployer', status: 'running', detail: 'Packaging Xcode project…',
        });

        const swiftProject = {
          appName: blueprint.appName,
          bundleId: blueprint.bundleId,
          deploymentTarget: blueprint.deploymentTarget,
          files,
          entryPoint: entryFilename,
        };

        sseEvent(controller, encoder, {
          type: 'agent', agent: 'deployer', status: 'done',
          detail: 'Xcode project ready — download to open in Xcode',
        });

        sseEvent(controller, encoder, { type: 'complete', project: swiftProject });

      } catch (err) {
        console.error('SwiftCoderAgent error:', err);
        sseEvent(controller, encoder, { type: 'error', message: err.message || 'Code generation failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
