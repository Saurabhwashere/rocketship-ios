import JSZip from 'jszip';

// ─── Xcode pbxproj generator (same as before) ────────────────────────────────

function guidFrom(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return (hex + hex + hex).slice(0, 24).toUpperCase();
}

function generatePbxproj(appName, bundleId, swiftFilenames) {
  const TARGET_GUID     = 'AA000000000000000000001A';
  const PROJECT_GUID    = 'AA000000000000000000002A';
  const SOURCES_GUID    = 'AA000000000000000000003A';
  const FRAMEWORKS_GUID = 'AA000000000000000000004A';
  const RESOURCES_GUID  = 'AA000000000000000000005A';
  const ASSETS_GUID     = 'AA000000000000000000006A';
  const ASSETS_REF_GUID = 'AA000000000000000000007A';

  const fileEntries = swiftFilenames.map(name => ({
    name,
    refGuid:   guidFrom(`ref_${name}`),
    buildGuid: guidFrom(`build_${name}`),
  }));

  const fileRefs = fileEntries.map(e =>
    `\t\t${e.refGuid} /* ${e.name} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${e.name}; sourceTree = "<group>"; };`
  ).join('\n');

  const buildFiles = fileEntries.map(e =>
    `\t\t${e.buildGuid} /* ${e.name} in Sources */ = {isa = PBXBuildFile; fileRef = ${e.refGuid} /* ${e.name} */; };`
  ).join('\n');

  const sourcesBuildPhaseFiles = fileEntries.map(e =>
    `\t\t\t\t${e.buildGuid} /* ${e.name} in Sources */,`
  ).join('\n');

  const groupChildren = fileEntries.map(e =>
    `\t\t\t\t${e.refGuid} /* ${e.name} */,`
  ).join('\n');

  return `// !$*UTF8*$!
{
\tarchiveVersion = 1;
\tclasses = {
\t};
\tobjectVersion = 56;
\tobjects = {

/* Begin PBXBuildFile section */
${buildFiles}
\t\t${ASSETS_GUID} /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = ${ASSETS_REF_GUID} /* Assets.xcassets */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
${fileRefs}
\t\t${ASSETS_REF_GUID} /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
\t\t${FRAMEWORKS_GUID} /* Frameworks */ = {
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
\t\tAA000000000000000000008A = {
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\tAA000000000000000000009A /* ${appName} */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t};
\t\tAA000000000000000000009A /* ${appName} */ = {
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
${groupChildren}
\t\t\t\t${ASSETS_REF_GUID} /* Assets.xcassets */,
\t\t\t);
\t\t\tpath = ${appName};
\t\t\tsourceTree = "<group>";
\t\t};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t${TARGET_GUID} /* ${appName} */ = {
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = AA00000000000000000000AA /* Build configuration list for PBXNativeTarget "${appName}" */;
\t\t\tbuildPhases = (
\t\t\t\t${SOURCES_GUID} /* Sources */,
\t\t\t\t${FRAMEWORKS_GUID} /* Frameworks */,
\t\t\t\t${RESOURCES_GUID} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = ${appName};
\t\t\tproductName = ${appName};
\t\t\tproductType = "com.apple.product-type.application";
\t\t};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t${PROJECT_GUID} /* Project object */ = {
\t\t\tisa = PBXProject;
\t\t\tattributes = {
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1600;
\t\t\t\tLastUpgradeCheck = 1600;
\t\t\t};
\t\t\tbuildConfigurationList = AA00000000000000000000BB /* Build configuration list for PBXProject "${appName}" */;
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\ten,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = AA000000000000000000008A;
\t\t\tproductRefGroup = AA000000000000000000008A;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t${TARGET_GUID} /* ${appName} */,
\t\t\t);
\t\t};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
\t\t${RESOURCES_GUID} /* Resources */ = {
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\t${ASSETS_GUID} /* Assets.xcassets in Resources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t${SOURCES_GUID} /* Sources */ = {
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
${sourcesBuildPhaseFiles}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
\t\tAA00000000000000000000CC /* Debug */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tENABLE_TESTABILITY = YES;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
\t\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";
\t\t\t};
\t\t\tname = Debug;
\t\t};
\t\tAA00000000000000000000DD /* Release */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
\t\t\t\tENABLE_NS_ASSERTIONS = NO;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-O";
\t\t\t\tVALIDATE_PRODUCT = YES;
\t\t\t};
\t\t\tname = Release;
\t\t};
\t\tAA00000000000000000000EE /* Debug (Target) */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tASSTCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tASSTCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
\t\t\t\tCODE_SIGN_IDENTITY = "";
\t\t\t\tCODE_SIGNING_REQUIRED = NO;
\t\t\t\tCODE_SIGNING_ALLOWED = NO;
\t\t\t\tDEVELOPMENT_ASSET_PATHS = "\\\"${appName}/Preview Content\\\"";
\t\t\t\tDEVELOPMENT_TEAM = "";
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tINFOPLIST_FILE = ${appName}/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${bundleId};
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t};
\t\t\tname = Debug;
\t\t};
\t\tAA00000000000000000000FF /* Release (Target) */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tASSTCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tASSTCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
\t\t\t\tCODE_SIGN_IDENTITY = "";
\t\t\t\tCODE_SIGNING_REQUIRED = NO;
\t\t\t\tCODE_SIGNING_ALLOWED = NO;
\t\t\t\tDEVELOPMENT_ASSET_PATHS = "\\\"${appName}/Preview Content\\\"";
\t\t\t\tDEVELOPMENT_TEAM = "";
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tINFOPLIST_FILE = ${appName}/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${bundleId};
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t};
\t\t\tname = Release;
\t\t};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
\t\tAA00000000000000000000AA /* Build configuration list for PBXNativeTarget "${appName}" */ = {
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\tAA00000000000000000000EE /* Debug */,
\t\t\t\tAA00000000000000000000FF /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t};
\t\tAA00000000000000000000BB /* Build configuration list for PBXProject "${appName}" */ = {
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\tAA00000000000000000000CC /* Debug */,
\t\t\t\tAA00000000000000000000DD /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t};
/* End XCConfigurationList section */

\t};
\trootObject = ${PROJECT_GUID} /* Project object */;
}
`;
}

function generateInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key><string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSRequiresIPhoneOS</key><true/>
  <key>UIApplicationSceneManifest</key>
  <dict>
    <key>UIApplicationSupportsMultipleScenes</key><false/>
  </dict>
  <key>UILaunchScreen</key><dict/>
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
  </array>
</dict>
</plist>`;
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────

const GH = 'https://api.github.com';

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Rocketship-iOS-Builder',
  };
}

async function ghFetch(token, method, path, body) {
  const res = await fetch(`${GH}${path}`, {
    method,
    headers: ghHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub ${method} ${path} → ${res.status}: ${err.slice(0, 400)}`);
  }
  return res.json();
}

// ─── Push project to a new GitHub branch ─────────────────────────────────────

async function pushToGitHub(token, owner, repo, project) {
  const appName = project.appName.replace(/\s+/g, '');
  const branchName = `build/${appName.toLowerCase()}-${Date.now()}`;
  const bundleId = project.bundleId || `com.rocketship.${appName.toLowerCase()}`;

  // Get base commit SHA from main
  const ref = await ghFetch(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/main`);
  const baseSha = ref.object.sha;
  const baseCommit = await ghFetch(token, 'GET', `/repos/${owner}/${repo}/git/commits/${baseSha}`);
  const baseTreeSha = baseCommit.tree.sha;

  // Build file list
  const swiftFilenames = project.files.map(f => f.filename);
  const fileEntries = [
    { path: `${appName}.xcodeproj/project.pbxproj`, content: generatePbxproj(appName, bundleId, swiftFilenames) },
    { path: `${appName}/Info.plist`, content: generateInfoPlist() },
    { path: `${appName}/Assets.xcassets/Contents.json`, content: JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2) },
    { path: `${appName}/Assets.xcassets/AppIcon.appiconset/Contents.json`, content: JSON.stringify({
        images: [{ idiom: 'universal', platform: 'ios', size: '1024x1024' }],
        info: { author: 'xcode', version: 1 },
      }, null, 2),
    },
    ...project.files.map(f => ({ path: `${appName}/${f.filename}`, content: f.content })),
  ];

  // Create blobs in parallel (batches of 4 to avoid rate limits)
  const treeItems = [];
  for (let i = 0; i < fileEntries.length; i += 4) {
    const batch = fileEntries.slice(i, i + 4);
    const blobs = await Promise.all(batch.map(file =>
      ghFetch(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
        content: Buffer.from(file.content, 'utf8').toString('base64'),
        encoding: 'base64',
      })
    ));
    blobs.forEach((blob, idx) => {
      treeItems.push({ path: batch[idx].path, mode: '100644', type: 'blob', sha: blob.sha });
    });
  }

  // Create tree → commit → branch
  const tree = await ghFetch(token, 'POST', `/repos/${owner}/${repo}/git/trees`, {
    base_tree: baseTreeSha, tree: treeItems,
  });
  const commit = await ghFetch(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
    message: `build: ${project.appName} — Rocketship`, tree: tree.sha, parents: [baseSha],
  });
  await ghFetch(token, 'POST', `/repos/${owner}/${repo}/git/refs`, {
    ref: `refs/heads/${branchName}`, sha: commit.sha,
  });

  return { branchName, appName };
}

// ─── Trigger workflow_dispatch ────────────────────────────────────────────────

async function triggerWorkflow(token, owner, repo, branchName, appName) {
  const { workflows } = await ghFetch(token, 'GET', `/repos/${owner}/${repo}/actions/workflows`);
  const wf = workflows.find(w => w.name === 'Build iOS App');
  if (!wf) throw new Error(
    'Workflow "Build iOS App" not found. Create .github/workflows/build-ios.yml in your builds repo.'
  );
  await ghFetch(token, 'POST', `/repos/${owner}/${repo}/actions/workflows/${wf.id}/dispatches`, {
    ref: branchName, inputs: { app_name: appName },
  });
  return wf.id;
}

// ─── Find the new run ID ──────────────────────────────────────────────────────

async function findRunId(token, owner, repo, workflowId, branchName) {
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 4000));
    const data = await ghFetch(token, 'GET',
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?branch=${encodeURIComponent(branchName)}&per_page=3`
    );
    if (data.workflow_runs.length > 0) return data.workflow_runs[0].id;
  }
  throw new Error('Build workflow did not start within 80 seconds');
}

// ─── Poll until run completes ─────────────────────────────────────────────────

async function pollUntilDone(token, owner, repo, runId, emit) {
  const startTime = Date.now();
  const deadline = startTime + 12 * 60 * 1000; // 12 minutes max

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 10000));
    const run = await ghFetch(token, 'GET', `/repos/${owner}/${repo}/actions/runs/${runId}`);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    emit({ type: 'log', message: `${run.status} — ${elapsed}s elapsed` });

    if (run.status === 'completed') {
      if (run.conclusion === 'success') return;
      throw new Error(`Build ${run.conclusion}. Check GitHub Actions: ${run.html_url}`);
    }
  }
  throw new Error('Build timed out after 12 minutes');
}

// ─── Download artifact and extract Appetize publicKey ─────────────────────────

async function getAppetizeKey(token, owner, repo, runId) {
  const { artifacts } = await ghFetch(token, 'GET', `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`);
  const artifact = artifacts.find(a => a.name === 'appetize-result');
  if (!artifact) throw new Error('appetize-result artifact not found in completed build');

  const dlRes = await fetch(artifact.archive_download_url, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Rocketship-iOS-Builder' },
    redirect: 'follow',
  });
  if (!dlRes.ok) throw new Error(`Artifact download failed: ${dlRes.status}`);

  const buf = Buffer.from(await dlRes.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const jsonFile = zip.file('appetize-result.json');
  if (!jsonFile) throw new Error('appetize-result.json missing from artifact');

  const { publicKey } = JSON.parse(await jsonFile.async('text'));
  if (!publicKey) throw new Error('No publicKey in appetize-result.json — check the build logs');
  return publicKey;
}

// ─── Route handler (SSE stream) ───────────────────────────────────────────────

export async function POST(request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(payload) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }

      try {
        const { project } = await request.json();
        if (!project?.files?.length) {
          emit({ type: 'error', message: 'project with files is required' });
          controller.close(); return;
        }

        const token = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_REPO_OWNER;
        const repo  = process.env.GITHUB_REPO_NAME;

        if (!token || !owner || !repo) {
          emit({ type: 'skipped', message: 'GitHub build not configured (set GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME in .env.local)' });
          controller.close(); return;
        }

        // ── 1. Push Swift files to a new branch ──────────────────────────────
        emit({ type: 'log', message: `Pushing ${project.files.length} Swift files to GitHub...` });
        const { branchName, appName } = await pushToGitHub(token, owner, repo, project);
        emit({ type: 'log', message: `Branch created: ${branchName}` });

        // ── 2. Trigger workflow_dispatch ──────────────────────────────────────
        emit({ type: 'log', message: 'Triggering macOS build workflow...' });
        const workflowId = await triggerWorkflow(token, owner, repo, branchName, appName);

        // ── 3. Find the run ID ────────────────────────────────────────────────
        emit({ type: 'log', message: 'Waiting for macOS runner to start...' });
        const runId = await findRunId(token, owner, repo, workflowId, branchName);
        emit({ type: 'log', message: `Build started (run #${runId}) — compiling Swift (~2–4 min)` });

        // ── 4. Poll until done ────────────────────────────────────────────────
        await pollUntilDone(token, owner, repo, runId, emit);
        emit({ type: 'log', message: 'Build succeeded! Uploading to Appetize...' });

        // ── 5. Get Appetize key from artifact ─────────────────────────────────
        const publicKey = await getAppetizeKey(token, owner, repo, runId);

        const previewUrl  = `https://appetize.io/embed/${publicKey}?device=iphone15pro&osVersion=17&scale=75&autoplay=true&orientation=portrait`;
        const appetizeUrl = `https://appetize.io/app/${publicKey}`;

        emit({ type: 'log', message: `Appetize ready — publicKey: ${publicKey}` });
        emit({ type: 'complete', publicKey, previewUrl, appetizeUrl });

      } catch (err) {
        console.error('GitHub build pipeline error:', err);
        emit({ type: 'error', message: err.message || 'Build pipeline failed' });
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
