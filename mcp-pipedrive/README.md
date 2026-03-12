# Pipedrive MCP Server

Pipedrive MCP server for PETA ecosystem with STDIO transport.

## Tools (57)

Deals:
1. `pipedriveListDeals`
2. `pipedriveSearchDeals`
3. `pipedriveGetDeal`
4. `pipedriveCreateDeal`
5. `pipedriveUpdateDeal`
6. `pipedriveDeleteDeal`
7. `pipedriveListDealActivities`
8. `pipedriveListDealProducts`
9. `pipedriveAddDealProduct`
10. `pipedriveRemoveDealProduct`

Persons:
11. `pipedriveListPersons`
12. `pipedriveSearchPersons`
13. `pipedriveGetPerson`
14. `pipedriveCreatePerson`
15. `pipedriveUpdatePerson`
16. `pipedriveDeletePerson`
17. `pipedriveMergePersons`
18. `pipedriveListPersonDeals`

Person tool notes:
- `pipedriveCreatePerson` / `pipedriveUpdatePerson` support structured `phone` and `email` values (array object format).

Organizations:
19. `pipedriveListOrganizations`
20. `pipedriveSearchOrganizations`
21. `pipedriveGetOrganization`
22. `pipedriveCreateOrganization`
23. `pipedriveUpdateOrganization`
24. `pipedriveDeleteOrganization`
25. `pipedriveMergeOrganizations`
26. `pipedriveListOrganizationDeals`

Activities:
27. `pipedriveListActivities`
28. `pipedriveGetActivity`
29. `pipedriveCreateActivity`
30. `pipedriveUpdateActivity`
31. `pipedriveDeleteActivity`
32. `pipedriveListActivityTypes`

Leads:
33. `pipedriveListLeads`
34. `pipedriveSearchLeads`
35. `pipedriveGetLead`
36. `pipedriveCreateLead`
37. `pipedriveUpdateLead`
38. `pipedriveDeleteLead`

Notes:
39. `pipedriveListNotes`
40. `pipedriveGetNote`
41. `pipedriveCreateNote`
42. `pipedriveUpdateNote`
43. `pipedriveDeleteNote`

Products:
44. `pipedriveListProducts`
45. `pipedriveSearchProducts`
46. `pipedriveGetProduct`
47. `pipedriveCreateProduct`
48. `pipedriveUpdateProduct`
49. `pipedriveDeleteProduct`

Pipelines / Stages:
50. `pipedriveListPipelines`
51. `pipedriveGetPipeline`
52. `pipedriveListStages`
53. `pipedriveGetStage`

Users / Search / Recents:
54. `pipedriveListUsers`
55. `pipedriveGetUser`
56. `pipedriveSearchAllItems`
57. `pipedriveListRecents`

## OAuth Scopes

Required for current tools:

Access to basic information:
- Access to basic information (`base`, default)

Read/Write CRM data:
- Deals: Full access (`deals:full`)
- Activities: Full access (`activities:full`)
- Contacts: Full access (`contacts:full`)
- Products: Full access (`products:full`)
- Leads: Full access (`leads:full`)

Read-only capability scopes:
- Read users data (`users:read`)
- See recent account activity (`recents:read`)
- Search for all data (`search:read`)

Optional (only if future tools are enabled):
- Administer account (`admin`)
- Projects (`projects:full`)
- Webhooks (`webhooks:full`)

## Runtime Token Model

This server reads:
- `process.env.accessToken`
- `process.env.apiDomain`

And supports runtime token updates from Core via:
- `notifications/token/update`
  - `token` or `accessToken`
  - optional `apiDomain`

No browser OAuth flow is implemented in this server.

## Development Environment Configuration

### 1) Local Node.js Startup

```bash
cd mcp-pipedrive
cp .env.example .env
# Fill accessToken + apiDomain in .env
npm install
npm run build
npm start
```

### 2) `.env` Example

```bash
accessToken=pipedrive-oauth-access-token
apiDomain=https://api.pipedrive.com
SERVER_NAME=mcp-pipedrive
NODE_ENV=development
```

### 3) Claude Desktop (Local Development)

Docker configuration:

```json
{
  "mcpServers": {
    "pipedrive": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "accessToken",
        "-e",
        "apiDomain",
        "ghcr.io/dunialabs/mcp-servers/pipedrive:latest"
      ],
      "env": {
        "accessToken": "pipedrive-oauth-access-token",
        "apiDomain": "https://api.pipedrive.com"
      }
    }
  }
}
```

Node.js configuration:

```json
{
  "mcpServers": {
    "pipedrive": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-pipedrive/dist/stdio.js"],
      "env": {
        "accessToken": "pipedrive-oauth-access-token",
        "apiDomain": "https://api.pipedrive.com"
      }
    }
  }
}
```

## Docker

```bash
./build-docker.sh
```

## Notes

- API client retries 429 and 5xx with exponential backoff.
- Error mapping follows repository conventions: AuthenticationFailed / PermissionDenied / NotFound / Conflict / RateLimited / ApiUnavailable.
- API implementation is v2-first with v1 fallback where v2 endpoints are not available/compatible in this workspace.
- v2 coverage in current implementation:
  - Activities API (core activity CRUD/list)
  - Deals API (core deal CRUD/list/search)
  - Deal Products API
  - Organizations API (core org CRUD/list/search)
  - Persons API (core person CRUD/list/search, including phones/emails with v2 field names)
  - Products API (core product CRUD/list/search)
  - Pipelines and Stages API
  - Search API (`/api/v2/itemSearch` for cross-object search tools)
- current v1 fallback areas:
  - Leads API
  - Notes API
  - Users/Recents
  - merge and some relationship listing routes (`person/org deals`, `deal activities`)
