import bundledModules from './bundledNativeModules.json' assert { type: 'json' };

/**
 * Attempt to parse a JSON object out of `text` even when the model has
 * added a preamble, a trailing sentence, or wrapped the output in a
 * markdown code fence.  Returns the parsed object or null on failure.
 */
export function extractJSON(text) {
  // 1. Direct parse — model followed instructions perfectly
  try { return JSON.parse(text.trim()); } catch {}

  // 2. Strip a leading/trailing code fence then retry
  const fenceStripped = text
    .trim()
    .replace(/^```(?:json|javascript|js)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try { return JSON.parse(fenceStripped); } catch {}

  // 3. Brace-match: find the first '{' and scan forward to its matching '}'
  //    so we ignore any preamble or trailing text the model added.
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch {}
        // JSON was found but still invalid (e.g. unescaped newline inside a
        // string value).  Fall through to null.
        break;
      }
    }
  }

  return null;
}

export function validateAppCode(code, blueprint) {
  const errors = [];

  // Check for forbidden relative imports
  const relativeImportRegex = /import\s+.*from\s+['"]\.\//g;
  if (relativeImportRegex.test(code)) {
    errors.push('Contains forbidden relative imports (from ./)');
  }

  // Check for export default
  if (!code.includes('export default')) {
    errors.push('Missing export default');
  }

  // Check for NavigationContainer if multi-screen app
  if (blueprint && blueprint.screens && blueprint.screens.length > 1) {
    if (!code.includes('NavigationContainer')) {
      errors.push('Missing NavigationContainer for multi-screen app');
    }
    if (!code.includes('createStackNavigator')) {
      errors.push('Missing createStackNavigator');
    }
  }

  // Check that all blueprint screens are defined
  if (blueprint && blueprint.screens) {
    for (const screen of blueprint.screens) {
      const namePattern = new RegExp(
        `(?:function\\s+${screen.name}\\s*\\(|(?:const|let|var)\\s+${screen.name}\\s*=)`
      );

      if (!namePattern.test(code)) {
        errors.push(`Missing screen function: ${screen.name}`);
      }
    }
  }

  // Check for StyleSheet.create
  if (!code.includes('StyleSheet.create')) {
    errors.push('Missing StyleSheet.create');
  }

  // Check for .js extensions on npm package imports (e.g. 'react-native-svg.js')
  const jsExtImports = code.match(/from\s+['"][^'"]+\.js['"]/g);
  if (jsExtImports) {
    errors.push(`Incorrect imports with .js extension: ${jsExtImports.map(m => m.replace(/from\s+/, '')).join(', ')}`);
  }

  // Check for packages that don't work reliably in Expo Snack
  const problematicPackages = [
    '@react-native-community/datetimepicker',
    '@react-native-community/slider',
    '@react-native-community/netinfo',
    '@react-native-async-storage/async-storage',
    '@react-native-picker/picker',
    'react-native-slider',
    'react-native-color-picker',
    'react-native-chart-kit',
    'react-native-svg-charts',
    'react-native-maps',
    'react-native-webview',
    'react-native-camera',
    'react-native-video',
    'react-native-image-picker',
    'react-native-fs',
    'react-native-ble-plx',
    'react-native-nfc-manager',
    'react-native-calendars',
    'react-native-date-picker',
    'react-native-modal-datetime-picker',
    'react-native-reanimated',
    'victory-native',
    'victory',
  ];
  const usedBadPkgs = problematicPackages.filter(pkg => code.includes(`from '${pkg}'`) || code.includes(`from "${pkg}"`));
  if (usedBadPkgs.length > 0) {
    errors.push(`Uses packages that may not work in Expo Snack: ${usedBadPkgs.join(', ')}. Replace with inline implementations or Expo-compatible alternatives.`);
  }

  // Check for whitespace text nodes inside Navigator (causes "found ' '" crash)
  if (/\{['"` ]\s*['"` ]\}/.test(code)) {
    errors.push("Contains JSX whitespace expressions like {' '} which crash inside Navigator — remove them");
  }

  // Check for dependencies that aren't in bundledNativeModules and aren't standard
  // This is handled by sanitizeDependencies at runtime, but we log it here for awareness
  const suspiciousImports = code.match(/from\s+['"]([^'"./][^'"]*)['"]/g);
  if (suspiciousImports) {
    const knownSafe = new Set([
      'react', 'react-native', '@react-navigation/native', '@react-navigation/stack',
      '@expo/vector-icons', 'react-native-gesture-handler', 'react-native-screens',
      'react-native-safe-area-context', '@react-native-masked-view/masked-view',
    ]);
    for (const match of suspiciousImports) {
      const pkg = match.replace(/from\s+['"]/, '').replace(/['"]$/, '');
      // Extract package name (handle scoped packages)
      const pkgName = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
      if (!knownSafe.has(pkgName) && !bundledModules[pkgName]) {
        errors.push(`Imports unknown package '${pkgName}' — may not work in Expo Snack. Build this functionality inline instead.`);
      }
    }
  }

  return errors;
}

/**
 * Count the net brace depth change for a single source line, ignoring any
 * '{' or '}' that appear inside string literals (single-quoted, double-quoted,
 * or template literals).  This prevents screenOptions={{ key: 'value' }} from
 * corrupting the depth counter used by fixNavigatorChildren.
 */
function countBraceDelta(line) {
  let delta      = 0;
  let inSingle   = false;
  let inDouble   = false;
  let inTemplate = false;
  let escape     = false;

  for (const ch of line) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && (inSingle || inDouble || inTemplate)) { escape = true; continue; }
    if (ch === "'" && !inDouble && !inTemplate) { inSingle   = !inSingle;   continue; }
    if (ch === '"' && !inSingle && !inTemplate) { inDouble   = !inDouble;   continue; }
    if (ch === '`' && !inSingle && !inDouble)   { inTemplate = !inTemplate; continue; }
    if (inSingle || inDouble || inTemplate) continue;
    if (ch === '{') delta++;
    else if (ch === '}') delta--;
  }
  return delta;
}

/**
 * Line-by-line state machine that strips non-Screen children from Navigator blocks.
 *
 * States:
 *   outside     — not inside any Navigator
 *   nav_tag     — inside the (possibly multi-line) Navigator opening tag
 *   nav_body    — inside Navigator, between Screen elements
 *   screen_tag  — collecting a multi-line Screen/Group opening tag
 *   screen_body — inside the children of a <Stack.Screen>…</Stack.Screen>
 *                 (the render-prop pattern)
 *
 * In nav_body, EVERYTHING that is not a Screen/Group open tag or the Navigator
 * close tag is silently dropped — including blank lines, {' '}, {" "}, JSX
 * comments, conditional expressions, and any other stray content.
 */
function fixNavigatorChildren(code) {
  const NAV_OPEN     = /<[A-Za-z]+\.Navigator\b/;
  const NAV_CLOSE    = /<\/[A-Za-z]+\.Navigator>/;
  const SCREEN_OPEN  = /<[A-Za-z]+\.(?:Screen|Group)\b/;
  const SCREEN_CLOSE = /<\/[A-Za-z]+\.(?:Screen|Group)>/;

  const lines  = code.split('\n');
  const output = [];

  let state      = 'outside';
  let braceDepth = 0;

  for (const line of lines) {
    const t = line.trim();

    if (state === 'outside') {
      output.push(line);
      if (NAV_OPEN.test(t)) {
        state      = 'nav_tag';
        braceDepth = countBraceDelta(t);
        // Tag closes on the same line and is not self-closing → enter body immediately
        if (braceDepth <= 0 && t.endsWith('>') && !t.endsWith('/>')) state = 'nav_body';
      }

    } else if (state === 'nav_tag') {
      // Still collecting the multi-line Navigator opening tag — always emit
      output.push(line);
      braceDepth += countBraceDelta(t);
      if (braceDepth <= 0 && t.endsWith('>') && !t.endsWith('/>')) state = 'nav_body';

    } else if (state === 'nav_body') {
      if (NAV_CLOSE.test(t)) {
        output.push(line);
        state = 'outside';
      } else if (SCREEN_OPEN.test(t)) {
        output.push(line);
        if (t.endsWith('/>')) {
          // Self-closing Screen on one line — stay in nav_body
        } else if (!t.includes('</') && t.endsWith('>')) {
          // Opening tag already closed — Screen has render-prop children
          state = 'screen_body';
        } else if (!t.includes('</')) {
          // Multi-line Screen opening tag — track brace depth to find its end
          state      = 'screen_tag';
          braceDepth = countBraceDelta(t);
        }
      }
      // ↑ EVERYTHING ELSE is silently dropped:
      //   blank lines, {' '}, {" "}, {`  `}, {/* comments */},
      //   conditional expressions, raw text — none of it belongs here.

    } else if (state === 'screen_tag') {
      // Collecting the rest of a multi-line Screen/Group opening tag.
      // countBraceDelta ignores braces inside string literals, so
      //   screenOptions={{ headerShown: false }}
      //   component={({ navigation }) => <HomeScreen ... />}
      // do not corrupt the depth counter.
      output.push(line);
      braceDepth += countBraceDelta(t);
      if (braceDepth <= 0) {
        if (t.endsWith('/>')) {
          state = 'nav_body';    // Screen self-closes
        } else if (t.endsWith('>') && !t.endsWith('/>')) {
          state = 'screen_body'; // Screen has render-prop children
        }
      }

    } else if (state === 'screen_body') {
      // Inside the children of a Screen element (render-prop pattern).
      // Emit everything — including inner '/>' — until the Screen's own closing tag.
      output.push(line);
      if (SCREEN_CLOSE.test(t)) {
        state = 'nav_body';
      } else if (NAV_CLOSE.test(t)) {
        state = 'outside'; // Malformed JSX — handle gracefully
      }
    }
  }

  return output.join('\n');
}

/**
 * Deterministic auto-fixes for common model mistakes.
 * Returns the patched code string.
 */
export function autoFixCode(code) {
  // Strip .js extensions from npm package imports
  code = code.replace(/(from\s+['"][^'"]+)\.js(['"])/g, '$1$2');

  // Ensure export default exists
  if (!code.includes('export default')) {
    const fnMatch = code.match(/function\s+(App)\s*\(/);
    const constMatch = code.match(/const\s+(App)\s*=/);
    const name = fnMatch?.[1] || constMatch?.[1];
    if (name) {
      code += `\nexport default ${name};\n`;
    }
  }

  // ── Aggressive JSX whitespace / empty-string expression removal ─────────────
  // Round 1: remove empty-string pairs  {''} {""}  {``}  { '' }  etc.
  code = code.replace(/\{\s*(['"`])\s*\1\s*\}/g, '');
  // Round 2: remove single-whitespace pairs  {' '}  {" "}  {` `}  { ' ' }  etc.
  code = code.replace(/\{\s*(['"`])\s+\1\s*\}/g, '');
  // Round 3: remove any string literal whose trimmed content is only whitespace
  code = code.replace(/\{\s*(['"`])([^'"` ]*)\1\s*\}/g, (match, _q, inner) =>
    inner.trim() === '' ? '' : match
  );

  // Remove all JSX block comments  {/* … */}
  code = code.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // Fix Navigator children using the line-by-line state machine.
  code = fixNavigatorChildren(code);

  // ── Nuclear final sweep ───────────────────────────────────────────────────
  // Belt-and-suspenders: zap any whitespace string expressions that somehow
  // survived the passes above (e.g. multi-line or unusual quoting).
  code = code.replace(/\{[\s]*['"`][\s]*['"`][\s]*\}/g, '');

  return code;
}

/**
 * Sanitize and pin dependencies to SDK 54 compatible versions.
 * - Packages in bundledNativeModules get the official SDK 54 version.
 * - Unknown packages are only kept if actually imported in the code.
 * - Core packages (react, react-native, expo) are always skipped.
 * - Navigation deps are always injected if NavigationContainer is used.
 */
export function sanitizeDependencies(dependencies, code) {
  const sanitized = {};

  for (const [pkg, version] of Object.entries(dependencies || {})) {
    // Skip core packages — built into Expo runtime
    if (pkg === 'react' || pkg === 'react-native' || pkg === 'expo' || pkg === 'react-dom') continue;

    // If the package is in bundledNativeModules, use the official SDK 54 version
    if (bundledModules[pkg]) {
      sanitized[pkg] = bundledModules[pkg];
      continue;
    }

    // Only include unknown packages if actually imported in the code
    if (code.includes(`from '${pkg}'`) || code.includes(`from "${pkg}"`)) {
      sanitized[pkg] = version;
    }
  }

  // Always ensure navigation deps are present if code uses them
  if (code.includes('NavigationContainer') || code.includes('@react-navigation/native')) {
    sanitized['@react-navigation/native'] = '7.1.6';
    sanitized['@react-navigation/stack'] = '7.4.1';
    sanitized['react-native-screens'] = bundledModules['react-native-screens'];
    sanitized['react-native-safe-area-context'] = bundledModules['react-native-safe-area-context'];
    sanitized['react-native-gesture-handler'] = bundledModules['react-native-gesture-handler'];
    sanitized['@react-native-masked-view/masked-view'] = bundledModules['@react-native-masked-view/masked-view'];
  }

  return sanitized;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Swift / SwiftUI validators (used by the new Swift iOS pipeline)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates a single Swift file for common issues.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateSwiftSyntax(content, filename = 'Unknown.swift') {
  const errors = [];
  const warnings = [];

  // 1. Unmatched braces
  let depth = 0;
  let inString = false;
  let inLineComment = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1] ?? '';
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (!inString && ch === '/' && next === '/') { inLineComment = true; continue; }
    if (ch === '"' && !inString) { inString = true; continue; }
    if (ch === '"' && inString) { inString = false; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (depth !== 0) {
    errors.push(`Unmatched braces (depth ends at ${depth}) — missing ${depth > 0 ? '}' : '{'}`);
  }

  // 2. View files must have a body property and #Preview
  if (content.includes(': View')) {
    if (!content.includes('var body: some View')) {
      errors.push('View struct missing required "var body: some View"');
    }
    if (!content.includes('#Preview')) {
      warnings.push('Missing #Preview macro — add at the end of the file');
    }
  }

  // 3. Deprecated SwiftUI patterns
  if (content.includes('NavigationView')) {
    errors.push('Uses deprecated NavigationView — replace with NavigationStack');
  }
  if (content.includes('ObservableObject')) {
    warnings.push('Uses ObservableObject — prefer @Observable macro (iOS 17+)');
  }
  if (content.includes('@Published')) {
    warnings.push('@Published is not needed with @Observable — remove it');
  }
  if (content.includes('@StateObject')) {
    warnings.push('@StateObject is not needed with @Observable — use @State instead');
  }
  if (content.includes('@ObservedObject')) {
    warnings.push('@ObservedObject is not needed with @Observable — remove the wrapper');
  }
  if (content.includes('DispatchQueue.main.async')) {
    warnings.push('Prefer @MainActor or .task modifier over DispatchQueue.main.async');
  }

  // 4. Force unwraps
  const forceUnwraps = (content.match(/![^=\s]/g) ?? []).length;
  if (forceUnwraps > 0) {
    warnings.push(`${forceUnwraps} potential force-unwrap(s) — prefer guard let or if let`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates that a SwiftProject is complete and consistent.
 * files should be an array of { filename, content, role }
 * Returns { valid: boolean, missing: string[], warnings: string[] }
 */
export function validateProjectCompleteness(files) {
  const missing = [];
  const warnings = [];

  if (!files || files.length === 0) {
    return { valid: false, missing: ['No files in project'], warnings };
  }

  // Must have exactly one @main entry point
  const entryFiles = files.filter(f => f.content.includes('@main'));
  if (entryFiles.length === 0) {
    missing.push('No @main entry point found');
  } else if (entryFiles.length > 1) {
    warnings.push(`Multiple @main structs found: ${entryFiles.map(f => f.filename).join(', ')}`);
  }

  // Must have at least one View file
  const viewFiles = files.filter(f => f.role === 'view' || f.content.includes(': View'));
  if (viewFiles.length === 0) {
    missing.push('No SwiftUI View files found');
  }

  // All View structs referenced in WindowGroup should have a corresponding file
  const entryContent = entryFiles[0]?.content ?? '';
  const viewRefs = entryContent.match(/\b([A-Z]\w+View)\b/g) ?? [];
  const knownViews = new Set(files.map(f => f.filename.replace('.swift', '')));
  for (const ref of viewRefs) {
    if (!knownViews.has(ref) && !entryContent.includes(`struct ${ref}`)) {
      missing.push(`View "${ref}" referenced but no corresponding file found`);
    }
  }

  // Check for any import that isn't SwiftUI, Foundation, or Combine
  for (const f of files) {
    const externalImports = (f.content.match(/^import\s+(?!SwiftUI|Foundation|Combine|UIKit|Charts)(\w+)/gm) ?? []);
    if (externalImports.length > 0) {
      warnings.push(`${f.filename} imports external frameworks: ${externalImports.join(', ')} — ensure these are available`);
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

/**
 * Applies deterministic auto-fixes to Swift code.
 * Returns the fixed code string.
 */
export function autoFixSwiftCode(content) {
  // Replace NavigationView with NavigationStack
  content = content.replace(/\bNavigationView\b/g, 'NavigationStack');

  // Remove @Published (not needed with @Observable)
  content = content.replace(/\s*@Published\s+/g, '\n    ');

  // Replace ObservableObject conformance with @Observable + remove class conformance
  content = content.replace(/:\s*ObservableObject\b/g, '');
  if (content.includes('class ') && !content.includes('@Observable')) {
    // Add @Observable before class declarations that had ObservableObject
    content = content.replace(/^(class\s+\w+)/m, '@Observable\n$1');
  }

  // Fix old @StateObject → @State
  content = content.replace(/@StateObject\s+/g, '@State ');

  // Fix old @ObservedObject → (nothing — @Observable infers this)
  content = content.replace(/@ObservedObject\s+/g, '');

  // Fix old Xcode 14 #if DEBUG / PreviewProvider patterns to #Preview
  content = content.replace(
    /struct\s+\w+_Previews:\s*PreviewProvider\s*\{[\s\S]*?static\s+var\s+previews:\s*some\s+View\s*\{([\s\S]*?)\}\s*\}/g,
    (_, body) => `#Preview {${body}}`
  );

  return content;
}

/**
 * Estimates the complexity tier of a Swift project.
 * @returns 'simple' | 'medium' | 'complex'
 */
export function estimateSwiftComplexity(files) {
  if (!files || files.length === 0) return 'simple';

  const viewCount = files.filter(f => f.role === 'view' || f.content.includes(': View')).length;
  const hasAsync = files.some(f => f.content.includes('async') || f.content.includes('await'));
  const hasNetworking = files.some(f => f.content.includes('URLSession') || f.content.includes('url:'));
  const hasPersistence = files.some(f => f.content.includes('UserDefaults') || f.content.includes('SwiftData') || f.content.includes('@Model'));
  const totalLines = files.reduce((sum, f) => sum + (f.content.split('\n').length), 0);

  if (viewCount <= 2 && !hasAsync && totalLines < 200) return 'simple';
  if (viewCount > 5 || hasNetworking || hasPersistence || totalLines > 600) return 'complex';
  return 'medium';
}
