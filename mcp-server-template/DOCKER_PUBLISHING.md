# Docker Publishing Guide

This guide explains how to build and publish Docker images to GitHub Container Registry (GHCR), both manually and automatically via GitHub Actions.

## Table of Contents

- [Automated Publishing (Recommended)](#automated-publishing-recommended)
- [Manual Publishing](#manual-publishing)
- [Troubleshooting](#troubleshooting)

---

## Automated Publishing (Recommended)

The repository uses GitHub Actions to automatically build and publish Docker images when you push a version tag.

### How It Works

1. **Update Version**: Update the version in `package.json`
2. **Create Git Tag**: Push a tag matching the pattern `mcp-[project-name]-v[version]`
3. **Automatic Build**: GitHub Actions automatically builds and publishes the Docker image

### Publishing Steps

```bash
# 1. Navigate to your MCP server directory
cd mcp-google-drive

# 2. Update version in package.json
# Edit package.json and update the "version" field to the new version (e.g., "1.2.0")

# 3. Commit the version change
git add package.json
git commit -m "chore: bump version to 1.2.0"

# 4. Create and push the version tag
# Format: mcp-[project-name]-v[version]
git tag mcp-google-drive-v1.2.0
git push origin mcp-google-drive-v1.2.0

# 5. GitHub Actions will automatically:
#    - Validate the tag format
#    - Verify package.json version matches tag
#    - Install dependencies
#    - Build TypeScript code
#    - Build multi-platform Docker images (amd64 + arm64)
#    - Push to GHCR
```

### Tag Format

The tag must follow this exact pattern:

```
mcp-[project-name]-v[major].[minor].[patch]
```

**Examples:**
- `mcp-google-drive-v1.2.0` ✅
- `mcp-rest-gateway-v2.0.1` ✅
- `mcp-notion-v1.5.3` ✅
- `google-drive-v1.2.0` ❌ (missing `mcp-` prefix)
- `mcp-google-drive-1.2.0` ❌ (missing `v` before version)

### What Gets Published

After a successful build, the following images are available:

```bash
# Version-specific tag
ghcr.io/dunialabs/mcp-servers/google-drive:1.2.0

# Latest tag (always points to the most recent version)
ghcr.io/dunialabs/mcp-servers/google-drive:latest
```

### Viewing Build Status

1. Go to your repository on GitHub
2. Click on **Actions** tab
3. Find your workflow run (named after your tag)
4. View the build logs and status

### GitHub Actions Workflow Details

The automated workflow (`.github/workflows/publish-mcp-package.yml`):

1. **Validates** tag format and version
2. **Builds** TypeScript code
3. **Creates** multi-platform Docker images (linux/amd64, linux/arm64)
4. **Publishes** to GitHub Container Registry
5. **Generates** a summary with pull commands

**No manual authentication needed** - GitHub Actions uses the built-in `GITHUB_TOKEN` automatically.

---

## Manual Publishing

For local development and testing, you can manually build and publish Docker images.

### Prerequisites

- Docker installed and running
- Node.js 18+ installed
- Write access to the `dunialabs/mcp-servers` repository
- GitHub Personal Access Token with `write:packages` permission

### Manual Publishing Steps

#### 1. First-time Setup: Login to GHCR

```bash
# Create a GitHub Personal Access Token (if you don't have one)
# Visit: https://github.com/settings/tokens
# Required permissions: write:packages, read:packages, delete:packages

# Login using your token
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

#### 2. Build and Push to GHCR

```bash
# Navigate to the MCP server directory
cd mcp-google-drive  # or any other MCP server

# Build TypeScript code first
npm run build

# Option 1: Local build (current platform only)
./build-docker.sh

# Option 2: Multi-platform build (amd64 + arm64, not loaded locally)
./build-docker.sh multi

# Option 3: Build and push to GHCR directly
./build-docker.sh push
```

#### 3. Verify Successful Push

After a successful push, you can verify the images on GitHub:
- Visit: `https://github.com/dunialabs/mcp-servers/packages`
- You should see all published images listed

### Build Script Commands

The `build-docker.sh` script supports the following commands:

```bash
./build-docker.sh          # Build for current platform only (fast, loaded locally)
./build-docker.sh multi    # Build for multiple platforms (amd64, arm64, not loaded locally)
./build-docker.sh push     # Build multi-platform and push to GHCR
./build-docker.sh clean    # Clean up buildx builder and containers
```

### Important Notes

1. **Repository Permissions**: Your GitHub account must have write access to the `dunialabs/mcp-servers` repository
2. **Token Permissions**: Your Personal Access Token needs `write:packages` permission
3. **Multi-platform Builds**: Using `./build-docker.sh push` automatically builds for both linux/amd64 and linux/arm64
4. **Build Before Docker**: Always run `npm run build` before building the Docker image
5. **Image Naming**: Images are automatically tagged with both the version from `package.json` and `latest`

### Quick Reference

```bash
# Complete publishing workflow
npm run build && ./build-docker.sh push

# Local testing only
npm run build && ./build-docker.sh

# Clean up buildx builder
./build-docker.sh clean

# View local images
docker images | grep ghcr.io/dunialabs/mcp-servers
```

## Troubleshooting

### Authentication Failed
```bash
# Re-login to GHCR
docker logout ghcr.io
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Build Failed: dist directory not found
```bash
# Make sure to build TypeScript first
npm run build
```

### Multi-platform build issues
```bash
# Clean up and recreate buildx builder
./build-docker.sh clean
docker buildx prune
./build-docker.sh multi
```

---

## Image Naming Convention

All images follow this naming pattern:
```
ghcr.io/dunialabs/mcp-servers/[server-name]:[version]
ghcr.io/dunialabs/mcp-servers/[server-name]:latest
```

Example:
```
ghcr.io/dunialabs/mcp-servers/google-drive:1.1.4
ghcr.io/dunialabs/mcp-servers/google-drive:latest
```
