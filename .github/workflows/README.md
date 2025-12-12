# GitHub Actions Workflows

## Overview

This directory contains GitHub Actions workflows for automating the build and publishing process of MCP packages.

### GHCR image naming (per project README)

Each MCP package publishes multi-arch images to GitHub Container Registry using the following convention:

| Package            | GHCR Image                                             |
|--------------------|--------------------------------------------------------|
| mcp-google-drive   | `ghcr.io/dunialabs/mcp-servers/google-drive`           |
| mcp-google-calendar| `ghcr.io/dunialabs/mcp-servers/google-calendar`        |
| mcp-notion         | `ghcr.io/dunialabs/mcp-servers/notion`                 |
| mcp-figma          | `ghcr.io/dunialabs/mcp-servers/figma`                  |
| mcp-postgres       | `ghcr.io/dunialabs/mcp-servers/postgres`               |
| mcp-rest-gateway   | `ghcr.io/dunialabs/mcp-servers/rest-gateway`           |
| mcp-server-template| `ghcr.io/dunialabs/mcp-servers/server-template`        |

These match the image references documented in each project’s README. The workflow described below automatically tags both `:VERSION` and `:latest` variants for the appropriate image.

## Workflows

### `publish-mcp-package.yml`

Automatically builds and publishes Docker images for individual MCP packages when a version tag is pushed.

**Trigger:** Git tags matching pattern `mcp-*-v*.*.*`

**Examples:**
- `mcp-rest-gateway-v1.0.1` → Publishes mcp-rest-gateway version 1.0.1
- `mcp-postgres-v2.0.0` → Publishes mcp-postgres version 2.0.0
- `mcp-notion-v1.5.0` → Publishes mcp-notion version 1.5.0

**What it does:**
1. ✅ Validates tag format and project directory
2. ✅ Verifies package.json version matches tag version
3. ✅ Builds TypeScript project (`npm run build`)
4. ✅ Builds multi-platform Docker images (linux/amd64, linux/arm64)
5. ✅ Pushes to GHCR: `ghcr.io/dunialabs/mcp-servers/PROJECT:VERSION`
6. ✅ Creates GitHub Release with installation instructions

## Setup

### 1. Enable GitHub Packages

Ensure GitHub Packages (Container Registry) is enabled for your organization:
- Go to: https://github.com/organizations/dunialabs/settings/packages
- Enable "Improved container support"

**Note:** No secrets configuration needed! GitHub automatically provides `GITHUB_TOKEN` with the necessary permissions.

### 2. Commit and Push Workflow

```bash
# Add the workflow file
git add .github/workflows/publish-mcp-package.yml
git commit -m "ci: add automated package publishing workflow"
git push
```

## Usage

### Publishing a Package

#### Step 1: Update package version

```bash
cd mcp-rest-gateway
npm version patch  # or minor, major
# This updates package.json to the new version
```

#### Step 2: Commit changes

```bash
git add package.json
git commit -m "chore(mcp-rest-gateway): bump version to 1.0.1"
git push
```

#### Step 3: Create and push tag

```bash
# Tag format: mcp-{package-name}-v{version}
git tag mcp-rest-gateway-v1.0.1
git push --tags
```

#### Step 4: Monitor workflow

- Go to: https://github.com/dunialabs/mcp-servers/actions
- Watch the "Publish MCP Package" workflow run
- Check for any errors

#### Step 5: Verify release

After successful workflow run:
- ✅ Check GHCR: https://github.com/dunialabs/mcp-servers/pkgs/container/mcp-servers%2Frest-gateway
- ✅ Check GitHub Release: https://github.com/dunialabs/mcp-servers/releases

## Examples

### Publishing mcp-rest-gateway v1.0.1

```bash
cd mcp-rest-gateway
npm version patch  # Updates to 1.0.1
git add package.json
git commit -m "chore(mcp-rest-gateway): bump version to 1.0.1"
git push

git tag mcp-rest-gateway-v1.0.1
git push --tags
```

### Publishing mcp-postgres v2.0.0

```bash
cd mcp-postgres
npm version major  # Updates to 2.0.0
git add package.json
git commit -m "chore(mcp-postgres): bump version to 2.0.0"
git push

git tag mcp-postgres-v2.0.0
git push --tags
```

## Troubleshooting

### Version mismatch error

**Error:** `Version mismatch! Tag version: 1.0.1, package.json version: 1.0.0`

**Solution:** Ensure package.json version matches the tag version:
```bash
cd mcp-rest-gateway
npm version 1.0.1  # Set to exact version
```

### Project directory not found

**Error:** `Project directory not found: mcp-rest-gateway`

**Solution:** Ensure tag name matches actual directory name:
- ✅ Correct: `mcp-rest-gateway-v1.0.1` (directory exists)
- ❌ Wrong: `mcp-gateway-v1.0.1` (directory doesn't exist)

## Manual Publishing (Alternative)

If you prefer to publish manually without GitHub Actions:

```bash
cd mcp-rest-gateway
npm run build
./build-docker.sh push
```

Then create GitHub Release manually:
```bash
gh release create mcp-rest-gateway-v1.0.1 \
  --title "mcp-rest-gateway v1.0.1" \
  --notes "Release notes..."
```

## Benefits of GitHub Actions

✅ **Automated**: Push tag → automatic build and publish
✅ **No secrets needed**: Uses built-in GITHUB_TOKEN
✅ **Consistent**: Same build process every time
✅ **Multi-platform**: Builds for amd64 and arm64
✅ **GitHub integrated**: Packages automatically linked to releases
✅ **Release notes**: Auto-generates GitHub Release with install commands
✅ **Auditable**: Full build logs in GitHub Actions
✅ **Team-friendly**: Anyone with push access can release

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
