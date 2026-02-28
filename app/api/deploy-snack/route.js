import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { autoFixCode } from '../utils';

export async function POST(request) {
  try {
    const { files, dependencies } = await request.json();

    if (!files || !files['App.js']) {
      return NextResponse.json({ error: 'App.js is required in files' }, { status: 400 });
    }

    const code = files['App.js'];

    // Last-resort: re-run autoFixCode at deploy time in case any whitespace
    // expressions survived the generate/fix pipeline. autoFixCode uses the same
    // battle-tested line-by-line state machine that handles screenOptions with
    // arrow functions correctly (unlike a regex approach which breaks on `=>`).
    const cleanCode = autoFixCode(code);

    // Packages that Snack pre-bundles into its runtime.
    // Using '*' tells Snack to use its own bundled version, avoiding version mismatch warnings.
    const snackBundled = {
      'react-native-gesture-handler': '*',
      'react-native-safe-area-context': '*',
      'react-native-screens': '*',
      '@expo/vector-icons': '*',
      'react-native-reanimated': '*',
    };

    // Packages Snack does NOT bundle — we must specify versions.
    const externalDeps = {
      '@react-navigation/native': '7.1.6',
      '@react-navigation/stack': '7.4.1',
      '@react-native-masked-view/masked-view': '0.3.2',
    };

    // Start with model deps, apply external pins, then Snack bundled overrides
    const mergedDeps = { ...(dependencies || {}), ...externalDeps, ...snackBundled };

    // Always include @expo/vector-icons if the code uses icons
    if (cleanCode.includes('Ionicons') || cleanCode.includes('@expo/vector-icons')) {
      mergedDeps['@expo/vector-icons'] = '*';
    }

    // Build dependency map for the Snack save API
    const snackDeps = {};
    for (const [pkg, ver] of Object.entries(mergedDeps)) {
      snackDeps[pkg] = { version: ver };
    }

    // Save the snack via Expo API to get a short ID
    const saveRes = await fetch('https://exp.host/--/api/v2/snack/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manifest: {
          sdkVersion: '54.0.0',
          name: 'RocketShip App',
          description: 'Created with RocketShip',
        },
        code: { 'App.js': { type: 'CODE', contents: cleanCode } },
        dependencies: snackDeps,
      }),
    });
    const saveData = await saveRes.json();

    if (!saveData.id) {
      console.error('Snack save response:', JSON.stringify(saveData));
      return NextResponse.json({ error: 'Failed to save snack' }, { status: 502 });
    }

    const snackId = saveData.id;

    // All URLs use the short saved ID — no inline code in URLs
    const embedUrl = `https://snack.expo.dev/embedded/${snackId}?platform=ios&preview=true&theme=light`;
    const snackUrl = `https://snack.expo.dev/${snackId}`;

    // QR code from the short permalink
    let qrUrl = null;
    try {
      qrUrl = await QRCode.toDataURL(snackUrl, { width: 200, margin: 1 });
    } catch {
      // QR generation failed — frontend will show fallback
    }

    return NextResponse.json({ embedUrl, snackUrl, qrUrl });

  } catch (error) {
    console.error('Snack deployment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deploy to Snack' },
      { status: 500 }
    );
  }
}
