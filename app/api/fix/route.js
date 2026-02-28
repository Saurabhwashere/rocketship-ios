import { NextResponse } from 'next/server';
import { extractJSON, validateAppCode, autoFixCode } from '../utils';

export async function POST(request) {
  try {
    const { code, errors, blueprint } = await request.json();

    if (!code || !errors || errors.length === 0) {
      return NextResponse.json(
        { error: 'code and non-empty errors array are required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a React Native + Expo code fixer. You receive broken App.js code along with a list of validation errors. Your job is to return a FIXED version of the same code — do NOT rewrite from scratch.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON: {"files":{"App.js":"...fixed code..."},"dependencies":{...}}
- Start your response with {"files":{"App.js": immediately
- No markdown, no explanations, no preamble, no trailing text

FIX RULES:
- Keep the existing app logic, screens, styling, and structure intact
- Only fix the specific issues listed in the errors
- If "Missing export default" — add \`export default App;\` at the end (or wrap the main component)
- If "Missing screen function: X" — add a stub function X with basic UI so navigation doesn't crash
- If "Contains forbidden relative imports" — inline the imported code or remove the import
- If "Missing NavigationContainer" — wrap the app in NavigationContainer + Stack.Navigator
- If "Missing createStackNavigator" — add the import and Stack variable
- If "Missing StyleSheet.create" — add a styles object using StyleSheet.create
- If "Incorrect import: remove .js extension" — remove .js from the import path

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
- ZERO relative imports (from './' or '../') — these WILL crash in Snack
- Only npm packages: react, react-native, @react-navigation/*, @expo/vector-icons
- NO .js extensions on imports
- FORBIDDEN PACKAGES (do NOT use): react-native-slider, @react-native-community/slider, @react-native-community/datetimepicker, @react-native-picker/picker, react-native-reanimated, victory-native, react-native-maps, react-native-webview
- For sliders — build inline using View + PanResponder or simple TouchableOpacity steps

TARGET: Expo SDK 54`;

    let bestFiles = null;
    let bestDeps = {};
    let bestErrors = errors;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const codeToFix = bestFiles ? bestFiles['App.js'] : code;
      const errorsToFix = bestErrors;

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'codestral-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Here is the broken App.js code:

\`\`\`javascript
${codeToFix}
\`\`\`

Validation errors to fix:
${errorsToFix.map((e, i) => `${i + 1}. ${e}`).join('\n')}

${blueprint ? `Blueprint for reference:\n${JSON.stringify(blueprint, null, 2)}` : ''}

Return the fixed code as JSON: {"files":{"App.js":"..."},"dependencies":{...}}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 16000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fix API call failed');
      }

      const data = await response.json();
      const raw = data.choices[0].message.content;
      const parsed = extractJSON(raw);

      if (!parsed || !parsed.files || !parsed.files['App.js']) {
        console.warn(`Fix attempt ${attempt}: failed to parse response`);
        continue;
      }

      // Run deterministic auto-fixes
      parsed.files['App.js'] = autoFixCode(parsed.files['App.js']);

      const fixedCode = parsed.files['App.js'];
      const remainingErrors = validateAppCode(fixedCode, blueprint);

      console.log(`Fix attempt ${attempt}: ${errorsToFix.length} errors → ${remainingErrors.length} remaining`);

      bestFiles = parsed.files;
      bestDeps = parsed.dependencies || {};
      bestErrors = remainingErrors;

      if (remainingErrors.length === 0) {
        break;
      }
    }

    if (!bestFiles) {
      return NextResponse.json(
        { error: 'Fix agent failed to produce valid output' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      files: bestFiles,
      dependencies: bestDeps,
      validationErrors: bestErrors,
    });
  } catch (error) {
    console.error('Fix error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fix code' },
      { status: 500 }
    );
  }
}
