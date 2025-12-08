# MCP SDK 1.23.0 Upgrade Guide

**Date**: 2025-11-27  
**SDK Versions**: 1.20.1/1.21.0 → 1.23.0  
**Strategy**: One-shot upgrade to the latest (recommended)

---

## 📋 Table of Contents

1. [Overview of Changes](#1-overview-of-changes)
2. [Impact Analysis](#2-impact-analysis)
3. [Upgrade Steps](#3-upgrade-steps)
4. [Breaking Changes](#4-breaking-changes)
5. [Optional New Features](#5-optional-new-features)
6. [Testing Checklist](#6-testing-checklist)
7. [Upgrade Timeline](#7-upgrade-timeline)
8. [Rollback Plan](#8-rollback-plan)
9. [FAQ](#9-faq)
10. [Summary](#10-summary)

---

## 1. Overview of Changes

### 1.1 Highlights

| Change | Details | Impact |
|--------|---------|--------|
| **Zod v4 support** | Supports Zod v4 while keeping compatibility with v3.25+ | ⚠️ Medium |
| **JSON Schema 2020-12** | `.catchall()` required for compliance | ⚠️ Medium |
| **Sampling with Tools** | New tool sampling capability (SEP-1577) | ✅ Optional |
| **URL-based client metadata** | Register client metadata via URL (SEP-991) | ✅ Optional |
| **SSE polling improvements** | Better handling of server disconnects (SEP-1699) | ℹ️ Internal |
| **Auth scope management** | 403 `insufficient_scope` upscoping (SEP-835) | ⚠️ Medium |
| **Test framework** | Jest → Vitest | ℹ️ Dev-only |

### 1.2 Current Project Status

| Project | Current SDK | Zod | Gap | Priority |
|---------|-------------|-----|-----|----------|
| **mcp-postgres** | ^1.20.1 | ^3.23.8 | 🔴 2 versions | 🔴 High |
| **mcp-google-drive** | ^1.20.1 | ^3.23.8 | 🔴 2 versions | 🔴 High |
| **mcp-notion** | ^1.21.0 | ^3.23.8 | 🟡 1 version | 🟡 Medium |
| **mcp-google-calendar** | ^1.21.0 | ^3.23.8 | 🟡 1 version | 🟡 Medium |
| **mcp-figma** | ^1.21.0 | ^3.23.8 | 🟡 1 version | 🟡 Medium |
| **mcp-server-template** | ^1.21.0 | – | 🟡 1 version | 🟡 Medium |

**Recommended strategy:** upgrade every server directly to 1.23.0. Incremental hops add work without benefit because 1.23.0 remains backward compatible.

---

## 2. Impact Analysis

### 2.1 Required Changes

#### 1. Dependencies

Update every `package.json`:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.23.0",
    "zod": "^3.23.8"
  }
}
```

(Postgres & Drive jump two versions but can do so in one go—just test thoroughly.)

#### 2. Schemas (`inputSchema` / `outputSchema`)

Because of JSON Schema 2020-12, every `z.object()` used for schemas must call `.catchall(z.unknown())`.

```ts
const InputSchema = z.object({
  query: z.string(),
  limit: z.number().optional(),
}).catchall(z.unknown());
```

### 2.2 Optional Changes

- Upgrade to Zod v4 for better typing/perf
- Implement Sampling with Tools if AI-driven flows are needed
- Opt into auth scope upscoping if your server handles OAuth scopes directly

### 2.3 Areas Unaffected

STDIO transport, `tools/list`, `tools/call`, resource handlers, logging, error handling, and Docker deployment remain unchanged.

---

## 3. Upgrade Steps

### 3.1 Preparation

```bash
git checkout -b upgrade-mcp-sdk-1.23.0
git add . && git commit -m "chore: snapshot before MCP SDK upgrade"
npm test
```

### 3.2 Per Project

1. **Dependencies**
   ```bash
   cd mcp-foo
   npm install @modelcontextprotocol/sdk@^1.23.0
   npm install zod@^4 # optional
   npm install
   ```
2. **Code edits** – append `.catchall(z.unknown())` to every `z.object()` used for schemas.
3. **Build & test**
   ```bash
   npm run clean
   npm run build
   npm test
   npm run type-check
   ```
4. **Manual validation** – `npx @modelcontextprotocol/inspector node dist/stdio.js`
5. **Commit** – capture `package.json`, `package-lock.json`, and source edits.

### 3.3 Batch Script

`upgrade-all-mcp-servers.sh` in the repo automates installing, building, and testing across multiple directories.

---

## 4. Breaking Changes

### 4.1 `.catchall()` requirement

Add `.catchall(z.unknown())` to every `z.object()` schema (tools, resources, sampling outputs). Optionally wrap this in a helper.

### 4.2 Zod v4 migration (optional)

Expect stricter type checks around `.parse()`, `.optional()`, `.default()`. Upgrade gradually and run full suites.

### 4.3 Auth scopes

PETA Core currently manages OAuth tokens and scopes, so MCP servers don’t need the new upscoping logic yet. Keep existing 403 handling.

---

## 5. Optional New Features

### 5.1 Sampling with Tools

Supports AI-initiated tool workflows via `CreateMessageRequestSchema`. Implement only if you need autonomous tool calling.

### 5.2 URL-based client metadata

Set `clientMetadataUrl` when instantiating the server if you need dynamic client registration. Optional for STDIO setups.

---

## 6. Testing Checklist

1. Compile: `npm run clean && npm run build`
2. Type-check: `npm run type-check`
3. Inspector: verify tools/list & tool calls via MCP Inspector
4. Integration: run through PETA Core, ensure token refresh & errors behave
5. Regression matrix: run key flows per server (Notion search/create, Calendar events, Figma file ops, etc.)

---

## 7. Upgrade Timeline

| Plan | Duration | Notes |
|------|----------|-------|
| Priority-based | 3–4 days | Postgres/Drive first, then others |
| Parallel | 6–8 hours | Higher risk; needs experienced team |
| Conservative | 1 week | One server per day |

---

## 8. Rollback Plan

```bash
git reset --hard HEAD~1
npm install
npm run clean && npm run build
npm test
```

To stay on older SDK versions temporarily, pin exact versions (remove `^`).

---

## 9. FAQ

- **Must we upgrade now?** Not strictly, but highly recommended for fixes & features.
- **Does `.catchall()` hurt perf?** No, it only affects schema exports.
- **Do we need Zod v4?** Optional. Nice to have but not required.
- **Rebuild Docker images?** Yes—run your `docker:build` scripts again.
- **Upgrade only some servers?** Totally fine; they’re independent.

---

## 10. Summary

### Must-do
1. Bump `@modelcontextprotocol/sdk` to ^1.23.0
2. Add `.catchall(z.unknown())` to every `z.object()` schema
3. Rebuild & retest

### Recommended
- Upgrade Zod, refresh OAuth flows, update docs

### Optional
- Sampling with Tools, URL metadata, Vitest migration

| Impact | Note |
|--------|------|
| Code changes | 🟡 Moderate |
| Testing | 🟡 Moderate |
| Risk | 🟢 Low |
| Priority | 🔴 High |

Need help? Ping the team any time during the upgrade.
