# GitHub Actions iOS Build Setup

One-time setup to enable live Appetize simulator.

## 1. Create the builds repo

Go to github.com → New repository → Name it `rocketship-ios-builds`
- Initialize with a README (so `main` branch exists)
- Make it **private** (your code is uploaded here)

## 2. Add the workflow file

In the repo, create `.github/workflows/build-ios.yml` with this content:

```yaml
name: Build iOS App

on:
  workflow_dispatch:
    inputs:
      app_name:
        description: 'App name (matches .xcodeproj name)'
        required: true

jobs:
  build:
    runs-on: macos-15
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: |
          sudo xcode-select -s $(ls -d /Applications/Xcode*.app | sort -V | tail -1)
          xcodebuild -version

      - name: Build for iOS Simulator
        run: |
          APP_NAME="${{ github.event.inputs.app_name }}"
          xcodebuild \
            -project "${APP_NAME}.xcodeproj" \
            -target "${APP_NAME}" \
            -sdk iphonesimulator \
            -configuration Debug \
            -derivedDataPath ./DerivedData \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO \
            CODE_SIGNING_ALLOWED=NO \
            build 2>&1 | tail -100

      - name: Package .app
        id: pkg
        run: |
          APP_NAME="${{ github.event.inputs.app_name }}"
          APP_DIR="./DerivedData/Build/Products/Debug-iphonesimulator"
          cd "$APP_DIR"
          zip -r "${APP_NAME}.zip" "${APP_NAME}.app"
          echo "zip=${APP_DIR}/${APP_NAME}.zip" >> $GITHUB_OUTPUT

      - name: Upload to Appetize
        id: appetize
        run: |
          APP_NAME="${{ github.event.inputs.app_name }}"
          ZIP="${{ steps.pkg.outputs.zip }}"
          RESPONSE=$(curl -s -X POST \
            -u "${{ secrets.APPETIZE_API_KEY }}:" \
            -F "file=@${ZIP}" \
            -F "platform=ios" \
            -F "note=${APP_NAME} via Rocketship" \
            https://api.appetize.io/v1/apps)
          echo "response: $RESPONSE"
          PUBLIC_KEY=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('publicKey',''))")
          echo "public_key=$PUBLIC_KEY" >> $GITHUB_OUTPUT
          echo "{\"publicKey\": \"$PUBLIC_KEY\"}" > appetize-result.json

      - name: Upload result artifact
        uses: actions/upload-artifact@v4
        with:
          name: appetize-result
          path: appetize-result.json
          retention-days: 1
```

## 3. Add repo secret

In the repo → Settings → Secrets and variables → Actions → New repository secret:
- Name: `APPETIZE_API_KEY`
- Value: your Appetize API key (e.g. `tok_pblbm63eycek2jjj5mkkhx7bua`)

## 4. Create a GitHub Personal Access Token

Go to github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- Repository access: Only `rocketship-ios-builds`
- Permissions:
  - Contents: **Read and write** (to push Swift files)
  - Actions: **Read and write** (to trigger workflow_dispatch)
  - Metadata: **Read** (required)

## 5. Add to .env.local

```
GITHUB_TOKEN=github_pat_...
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=rocketship-ios-builds
```

## How it works

1. User generates Swift code → code streams into Monaco editor
2. After generation: app pushes all Swift files + xcodeproj to a new branch
3. Triggers `workflow_dispatch` on `build-ios.yml`
4. GitHub macOS runner runs `xcodebuild -sdk iphonesimulator`
5. Zips the `.app` bundle → uploads to Appetize → saves `publicKey`
6. App polls until complete (~2-4 min) → shows Appetize link
7. User clicks "Launch Simulator" → Appetize.io opens in new tab

## Build time

~2–4 minutes total (macOS runner spin-up + xcodebuild + Appetize upload)
GitHub Free: 2000 macOS minutes/month (~400 builds)
