import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { extractJSON, validateAppCode, autoFixCode, sanitizeDependencies } from '../utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

function mistralHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
  };
}

async function callMistral(model, messages, opts = {}) {
  const res = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: mistralHeaders(),
    body: JSON.stringify({ model, messages, ...opts }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Mistral API error (${res.status})`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function deployToSnack(files, dependencies) {
  const cleanCode = autoFixCode(files['App.js']);

  const snackBundled = {
    'react-native-gesture-handler': '*',
    'react-native-safe-area-context': '*',
    'react-native-screens': '*',
    '@expo/vector-icons': '*',
    'react-native-reanimated': '*',
  };
  const externalDeps = {
    '@react-navigation/native': '7.1.6',
    '@react-navigation/stack': '7.4.1',
    '@react-native-masked-view/masked-view': '0.3.2',
  };
  const mergedDeps = { ...(dependencies || {}), ...externalDeps, ...snackBundled };
  if (cleanCode.includes('Ionicons') || cleanCode.includes('@expo/vector-icons')) {
    mergedDeps['@expo/vector-icons'] = '*';
  }

  const snackDeps = {};
  for (const [pkg, ver] of Object.entries(mergedDeps)) {
    snackDeps[pkg] = { version: ver };
  }

  const saveRes = await fetch('https://exp.host/--/api/v2/snack/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      manifest: { sdkVersion: '54.0.0', name: 'RocketShip App', description: 'Created with RocketShip' },
      code: { 'App.js': { type: 'CODE', contents: cleanCode } },
      dependencies: snackDeps,
    }),
  });
  const saveData = await saveRes.json();
  if (!saveData.id) throw new Error('Failed to save Snack — Expo API returned no ID');

  const snackId = saveData.id;
  const embedUrl = `https://snack.expo.dev/embedded/${snackId}?platform=ios&preview=true&theme=light`;
  const snackUrl = `https://snack.expo.dev/${snackId}`;

  let qrUrl = null;
  try { qrUrl = await QRCode.toDataURL(snackUrl, { width: 200, margin: 1 }); } catch {}

  return { embedUrl, snackUrl, qrUrl };
}

// ─── System prompts ───────────────────────────────────────────────────────────

const PLANNER_PROMPT = `You are a mobile app architect. Given a user's app description, produce a JSON blueprint that a code generator will use to build the app.

RULES:
- Minimum 3 screens, maximum 6 screens
- Every screen must have a clear single purpose
- Navigation must form a connected graph — every screen reachable from HomeScreen
- State management: useState in App.js, pass data via route.params
- Include realistic dummy data descriptions (not just "item 1, item 2")
- Estimate total lines of code realistically (simple=150-250, medium=250-400, complex=400-600)

OUTPUT SCHEMA (return ONLY this JSON, nothing else):
{
  "appName": "string",
  "screens": [
    {
      "name": "string — PascalCase like HomeScreen",
      "purpose": "string — one sentence",
      "components": ["React Native components used"],
      "navigation": { "to": ["screen names"], "back": "screen name or null" },
      "state": ["state variables"],
      "dataShape": "object or null"
    }
  ],
  "sharedState": "string",
  "dependencies": {
    "@react-navigation/native": "7.1.6",
    "@react-navigation/stack": "7.4.1",
    "react-native-safe-area-context": "5.6.0",
    "react-native-screens": "4.16.0",
    "react-native-gesture-handler": "2.28.0",
    "@react-native-masked-view/masked-view": "0.3.2"
  },
  "complexity": "simple | medium | complex",
  "estimatedLines": number
}`;

const CODER_PROMPT = `You are a React Native + Expo code generator. You receive a structured blueprint and produce working code.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON: {"files":{"App.js":"...code..."},"dependencies":{...}}
- Start your response with {"files":{"App.js": immediately
- No markdown, no explanations, no preamble, no trailing text

APP.JS RULES:
- App.js must be 100% self-contained with ZERO relative imports
- FORBIDDEN: import anything from './' or '../' — these WILL crash
- ALLOWED imports: only npm packages (react, react-native, @react-navigation/*, @expo/vector-icons, react-native-svg)
- FORBIDDEN PACKAGES (crash in Expo Snack): @react-native-community/datetimepicker, @react-native-community/slider, react-native-slider, @react-native-picker/picker, @react-native-async-storage/async-storage, react-native-color-picker, react-native-chart-kit, react-native-svg-charts, react-native-maps, react-native-webview, react-native-camera, react-native-video, react-native-image-picker, react-native-fs, react-native-calendars, react-native-date-picker, react-native-modal-datetime-picker, react-native-reanimated, victory-native, victory
- For SVGs — use @expo/vector-icons Ionicons instead
- For date pickers — build a simple inline picker using TouchableOpacity + state
- For sliders — build inline using TouchableOpacity steps or PanResponder
- Every screen is a named function defined directly in App.js
- App component uses NavigationContainer + Stack.Navigator

IMPORT STATEMENTS (use EXACT syntax):
- import React, { useState, useEffect } from 'react';
- import { View, Text, StyleSheet } from 'react-native';
- import { NavigationContainer } from '@react-navigation/native';
- import { createStackNavigator } from '@react-navigation/stack';
- import { Ionicons } from '@expo/vector-icons';
- NO .js extensions, NO relative paths

CODE STRUCTURE (follow this EXACT order):
1. All imports at the top
2. Dummy data constants
3. Screen functions — use EXACTLY the names from the blueprint
4. Stack navigator setup — matching exact blueprint screen names
5. Export default App function:
   a. useState hooks for all shared state
   b. const screen wrapper components (e.g. const HomeComp = ...) for screens needing state
   c. return with NavigationContainer > Stack.Navigator > Stack.Screen (one per line, self-closing)
6. StyleSheet.create at the bottom

STATE PASSING (ONLY use this approach):
- All shared state lives in the App function via useState
- Define const screen wrappers INSIDE App, BEFORE the return statement, one per screen that needs shared state:
    const HomeScreenComp = ({ navigation, route }) => <HomeScreen navigation={navigation} route={route} items={items} setItems={setItems} />;
- Use those const refs in Stack.Screen: <Stack.Screen name="Home" component={HomeScreenComp} />
- Screens that need NO shared state use the function name directly: <Stack.Screen name="Settings" component={SettingsScreen} />
- Screens receive: function HomeScreen({ navigation, route, items, setItems })
- Navigate with data: navigation.navigate('DetailScreen', { itemId: item.id })
- ALWAYS default route.params with || {} to prevent undefined crashes

NAVIGATOR RULES (CRITICAL — violating these causes a runtime crash):
- Stack.Navigator may ONLY contain Stack.Screen elements as its direct children
- NEVER place ANY of the following between Stack.Screen elements:
    {' '}  {" "}  {\` \`}  {''}  {""}
    {/* any comment */}
    blank lines
    raw text
    conditional expressions (&& or ternary)
    any JSX other than Stack.Screen / Stack.Group
- Write ALL Stack.Screen elements consecutively with NO separation whatsoever:
    <Stack.Navigator>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="DetailScreen" component={DetailScreen} />
    </Stack.Navigator>
- When using render props, the ONLY valid pattern is:
    <Stack.Screen name="HomeScreen">
      {(props) => <HomeScreen {...props} items={items} />}
    </Stack.Screen>
    with NO whitespace, blank lines, or any other content between sibling Stack.Screen elements

DESIGN:
- Dark theme: background #0D0D0D, cards #1A1A24, accent #F97316, text #FFFFFF, muted #9999AA
- All lists use FlatList (never ScrollView with .map())
- All interactive elements use TouchableOpacity with activeOpacity={0.8}
- Icons from Ionicons (@expo/vector-icons)
- Minimum 8 realistic dummy data items per list
- Every screen must be fully designed — no placeholder text

TARGET: Expo SDK 54`;

const FIXER_PROMPT = `You are a React Native + Expo code fixer. You receive broken App.js code along with validation errors. Return a FIXED version — do NOT rewrite from scratch.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON: {"files":{"App.js":"...fixed code..."},"dependencies":{...}}
- Start your response with {"files":{"App.js": immediately
- No markdown, no explanations, no preamble, no trailing text

FIX RULES:
- Keep the existing app logic, screens, styling, and structure intact
- Only fix the specific issues listed in the errors
- If "Missing export default" — add export default App; at the end
- If "Missing screen function: X" — add a stub function X with basic UI
- If "Contains forbidden relative imports" — inline the imported code or remove the import
- If "Missing NavigationContainer" — wrap the app in NavigationContainer + Stack.Navigator
- If "Missing createStackNavigator" — add the import and Stack variable
- If "Missing StyleSheet.create" — add a styles object
- If "Contains JSX whitespace expressions" — remove ALL {' '}, {" "}, {\` \`}, {''}, {""} and any {/* comment */} that appear anywhere in the file; Stack.Navigator may ONLY have Stack.Screen or Stack.Group as direct children

NAVIGATOR RULES (CRITICAL — violating these causes a runtime crash):
- Stack.Navigator may ONLY contain Stack.Screen elements as its direct children
- NEVER place ANY of the following between Stack.Screen elements:
    {' '}  {" "}  {\` \`}  {''}  {""}
    {/* any comment */}
    blank lines
    raw text
    conditional expressions (&& or ternary)
    any JSX other than Stack.Screen / Stack.Group
- Write ALL Stack.Screen elements consecutively with NO separation whatsoever:
    <Stack.Navigator>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="DetailScreen" component={DetailScreen} />
    </Stack.Navigator>
- When using render props, the ONLY valid pattern is:
    <Stack.Screen name="HomeScreen">
      {(props) => <HomeScreen {...props} items={items} />}
    </Stack.Screen>
    with NO whitespace, blank lines, or any other content between sibling Stack.Screen elements

IMPORT RULES:
- ZERO relative imports — these WILL crash in Snack
- Only npm packages: react, react-native, @react-navigation/*, @expo/vector-icons
- NO .js extensions on imports
- FORBIDDEN: react-native-slider, @react-native-community/slider, react-native-reanimated, victory-native, react-native-maps

TARGET: Expo SDK 54`;

// ─── Streaming POST handler ───────────────────────────────────────────────────

export async function POST(request) {
  const { prompt, existingCode } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      /** Emit a single SSE line. */
      const send = (payload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {

        // ══════════════════════════════════════════════════════
        // AGENT 1 — PLANNER
        // Uses mistral-small to produce a structured JSON blueprint
        // ══════════════════════════════════════════════════════
        send({ agent: 'planner', status: 'running', detail: 'Designing app architecture…' });

        const planRaw = await callMistral(
          'mistral-small-latest',
          [
            { role: 'system', content: PLANNER_PROMPT },
            { role: 'user', content: `Design a mobile app for: ${prompt}` },
          ],
          { temperature: 0.3, max_tokens: 2000, response_format: { type: 'json_object' } }
        );

        const blueprint = extractJSON(planRaw);
        if (!blueprint?.screens || !blueprint?.appName) {
          throw new Error('Planner returned an invalid blueprint. Please try a different description.');
        }

        send({
          agent: 'planner',
          status: 'done',
          detail: `${blueprint.screens.length} screens · ${blueprint.complexity}`,
          blueprint,
        });

        // ══════════════════════════════════════════════════════
        // AGENT 2 — CODER
        // Uses codestral to generate all React Native code
        // ══════════════════════════════════════════════════════
        send({ agent: 'coder', status: 'running', detail: 'Writing React Native code…' });

        const coderUserMsg = existingCode
          ? `Here is the existing App.js that is already working:\n\`\`\`javascript\n${existingCode}\n\`\`\`\n\nHere is the updated blueprint:\n${JSON.stringify(blueprint, null, 2)}\n\nUser's new request: ${prompt}\n\nUpdate the existing App.js to fulfil the new requirements. Preserve relevant parts and only change what is needed. Return the complete updated App.js.`
          : `Here is the blueprint to implement:\n${JSON.stringify(blueprint, null, 2)}\n\nUser's original request: ${prompt}\n\nImplement this blueprint as a complete, working App.js. Follow the blueprint exactly.`;

        let codeResult = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          const raw = await callMistral(
            'codestral-latest',
            [
              { role: 'system', content: CODER_PROMPT },
              { role: 'user', content: coderUserMsg },
            ],
            { temperature: attempt === 1 ? 0.5 : 0.7, max_tokens: 16000, response_format: { type: 'json_object' } }
          );
          const parsed = extractJSON(raw);
          if (parsed?.files?.['App.js']) { codeResult = parsed; break; }
        }

        if (!codeResult) throw new Error('Coder failed to generate valid code. Please try a simpler description.');

        codeResult.files['App.js'] = autoFixCode(codeResult.files['App.js']);
        const lineCount = codeResult.files['App.js'].split('\n').length;

        send({
          agent: 'coder',
          status: 'done',
          detail: `${lineCount} lines · ${Object.keys(codeResult.files).length} file${Object.keys(codeResult.files).length > 1 ? 's' : ''}`,
        });

        // ══════════════════════════════════════════════════════
        // AGENT 3 — VALIDATOR
        // Deterministic static analysis — no LLM call
        // ══════════════════════════════════════════════════════
        send({ agent: 'validator', status: 'running', detail: 'Reviewing code quality…' });

        const allErrors = validateAppCode(codeResult.files['App.js'], blueprint);
        const criticalErrors = allErrors.filter(e =>
          e.includes('Missing screen function') ||
          e.includes('Missing NavigationContainer') ||
          e.includes('Missing createStackNavigator') ||
          e.includes('forbidden relative imports') ||
          e.includes('Missing export default') ||
          e.includes('may not work in Expo Snack') ||
          e.includes('whitespace expressions')
        );

        if (criticalErrors.length === 0) {
          send({
            agent: 'validator',
            status: 'done',
            detail: allErrors.length === 0 ? 'All checks passed ✓' : `${allErrors.length} minor warning${allErrors.length > 1 ? 's' : ''}`,
          });
          send({ agent: 'fixer', status: 'skipped', detail: 'No critical issues — skipped' });
        } else {
          send({
            agent: 'validator',
            status: 'done',
            detail: `${criticalErrors.length} critical issue${criticalErrors.length > 1 ? 's' : ''} found`,
          });

          // ════════════════════════════════════════════════════
          // AGENT 4 — FIXER
          // Uses codestral to patch only the broken parts
          // ════════════════════════════════════════════════════
          send({
            agent: 'fixer',
            status: 'running',
            detail: `Fixing ${criticalErrors.length} issue${criticalErrors.length > 1 ? 's' : ''}…`,
          });

          let bestCode = codeResult.files['App.js'];
          let remainingErrors = criticalErrors;

          for (let attempt = 1; attempt <= 2; attempt++) {
            const fixUserMsg = `Here is the broken App.js:\n\`\`\`javascript\n${bestCode}\n\`\`\`\n\nValidation errors to fix:\n${remainingErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\n${blueprint ? `Blueprint for reference:\n${JSON.stringify(blueprint, null, 2)}` : ''}\n\nReturn the fixed code as JSON: {"files":{"App.js":"..."},"dependencies":{...}}`;

            const fixRaw = await callMistral(
              'codestral-latest',
              [
                { role: 'system', content: FIXER_PROMPT },
                { role: 'user', content: fixUserMsg },
              ],
              { temperature: 0.3, max_tokens: 16000, response_format: { type: 'json_object' } }
            );

            const fixParsed = extractJSON(fixRaw);
            if (fixParsed?.files?.['App.js']) {
              bestCode = autoFixCode(fixParsed.files['App.js']);
              remainingErrors = validateAppCode(bestCode, blueprint).filter(e =>
                e.includes('Missing screen function') || e.includes('Missing NavigationContainer') ||
                e.includes('Missing createStackNavigator') || e.includes('forbidden relative imports') ||
                e.includes('Missing export default') || e.includes('may not work in Expo Snack') ||
                e.includes('whitespace expressions')
              );
              if (fixParsed.dependencies) {
                codeResult.dependencies = { ...codeResult.dependencies, ...fixParsed.dependencies };
              }
              if (remainingErrors.length === 0) break;
            }
          }

          codeResult.files['App.js'] = bestCode;
          send({
            agent: 'fixer',
            status: 'done',
            detail: remainingErrors.length === 0
              ? 'All issues resolved ✓'
              : `${remainingErrors.length} issue${remainingErrors.length > 1 ? 's' : ''} remaining`,
          });
        }

        // ── Final safety guard ────────────────────────────────
        // If any whitespace string expressions somehow survived every earlier pass
        // (aggressive regex, fixNavigatorChildren, fixer LLM), strip them now before
        // deploying so they never reach Expo Snack.
        if (
          codeResult.files['App.js'].includes("{' '}") ||
          codeResult.files['App.js'].includes('{"  "}') ||
          /\{[\s]*['"`][\s]*['"`][\s]*\}/.test(codeResult.files['App.js'])
        ) {
          codeResult.files['App.js'] = autoFixCode(codeResult.files['App.js']);
        }

        // ══════════════════════════════════════════════════════
        // AGENT 5 — DEPLOYER
        // Publishes to Expo Snack, generates QR code
        // ══════════════════════════════════════════════════════
        send({ agent: 'deployer', status: 'running', detail: 'Publishing to Expo Snack…' });

        const sanitizedDeps = sanitizeDependencies(codeResult.dependencies || {}, codeResult.files['App.js']);
        const snackData = await deployToSnack(codeResult.files, sanitizedDeps);

        send({ agent: 'deployer', status: 'done', detail: 'Live on Expo! 🎉' });

        // ── Final result ──────────────────────────────────────
        send({ type: 'complete', files: codeResult.files, snackData });

      } catch (err) {
        console.error('[build] pipeline error:', err);
        send({ type: 'error', message: err.message || 'Something went wrong in the pipeline' });
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
