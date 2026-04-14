# HubSpot MCP Server

HubSpot MCP server for PETA ecosystem with STDIO transport.

## MCP Apps Views

The following tools now expose MCP Apps views in clients that support Apps:

- `hubspotSearchContacts`
- `hubspotSearchCompanies`
- `hubspotSearchDeals`
- `hubspotGetDeal`

Behavior:
- Apps-capable clients render a CRM browser or deal detail view
- Non-Apps clients continue to receive the original JSON/text fallback

## Build Notes

`npm run build` now performs both steps:

1. compile the server TypeScript
2. build the MCP Apps HTML resources

If you only need to rebuild the UI resources during local view iteration:

```bash
npm run build:app
```

## Tools (36)

1. `hubspotGetContact`
2. `hubspotSearchContacts`
3. `hubspotCreateContact`
4. `hubspotUpdateContact`
5. `hubspotUpsertContactByEmail`
6. `hubspotGetCompany`
7. `hubspotSearchCompanies`
8. `hubspotCreateCompany`
9. `hubspotUpdateCompany`
10. `hubspotGetDeal`
11. `hubspotSearchDeals`
12. `hubspotCreateDeal`
13. `hubspotUpdateDeal`
14. `hubspotGetTicket`
15. `hubspotSearchTickets`
16. `hubspotCreateTicket`
17. `hubspotUpdateTicket`
18. `hubspotGetAssociations`
19. `hubspotAssociateRecords`
20. `hubspotGetObjectProperties`
21. `hubspotCreateNoteEngagement`
22. `hubspotGetPipelineSummary`
23. `hubspotGetOwnerWorkload`
24. `hubspotValidateRecordRequiredFields`
25. `hubspotArchiveContact`
26. `hubspotArchiveCompany`
27. `hubspotArchiveDeal`
28. `hubspotArchiveTicket`
29. `hubspotRemoveAssociation`
30. `hubspotBatchUpdateContacts`
31. `hubspotBatchUpdateCompanies`
32. `hubspotBatchUpdateDeals`
33. `hubspotBatchUpdateTickets`
34. `hubspotListDealPipelines`
35. `hubspotListTicketPipelines`
36. `hubspotListPipelineStages`

## OAuth Scope

Required base:
- `oauth`

CRM Objects:
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.objects.companies.read`
- `crm.objects.companies.write`
- `crm.objects.deals.read`
- `crm.objects.deals.write`
- `tickets`

Schema / Properties:
- `crm.schemas.contacts.read`
- `crm.schemas.companies.read`
- `crm.schemas.deals.read`

Owners:
- `crm.objects.owners.read`

HubSpot UI compatibility notes:
- Some portals show a merged `tickets` scope instead of separate `crm.objects.tickets.read` / `crm.objects.tickets.write`.
- Some portals do not expose `notes` or `engagement` scopes. In that case, `hubspotCreateNoteEngagement` may return 403 and should be treated as optional.
- Configure scopes based on what your HubSpot UI exposes, then verify by real API calls. API success is the final source of truth.

## Runtime Token Model

This server reads `process.env.accessToken` and supports runtime token updates from Core via:

- `notifications/token/update`

No browser OAuth flow is implemented in this server.

## Development Environment Configuration

### 1) Local Node.js Startup

```bash
cd mcp-hubspot
cp .env.example .env
# Fill in accessToken in .env
npm install
npm run build
npm start
```

### 2) `.env` Example

```bash
accessToken=hubspot-oauth-access-token
SERVER_NAME=mcp-hubspot
NODE_ENV=development
```

### 3) Claude Desktop (Local Development)

Docker configuration:

```json
{
  "mcpServers": {
    "hubspot": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "accessToken",
        "ghcr.io/dunialabs/mcp-servers/hubspot:latest"
      ],
      "env": {
        "accessToken": "hubspot-oauth-access-token"
      }
    }
  }
}
```

Node.js configuration:

```json
{
  "mcpServers": {
    "hubspot": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-hubspot/dist/stdio.js"],
      "env": {
        "accessToken": "hubspot-oauth-access-token"
      }
    }
  }
}
```

## PetaConsole Configuration (PETA Core)

PetaConsole / Core will automatically:
1. Start this MCP server via STDIO transport (Docker or Node.js)
2. Inject the `accessToken` environment variable
3. Refresh tokens and notify the running process through `notifications/token/update`

## Docker

```bash
./build-docker.sh
```

## Tool Notes

- This server retries HubSpot 429 and 5xx responses with exponential backoff.
- `hubspotAssociateRecords` uses HubSpot default association API.
- `hubspotRemoveAssociation` removes default association using HubSpot CRM v4 associations API.
- `hubspotCreateNoteEngagement` creates a note first, then associates the note to target records.
- `hubspotValidateRecordRequiredFields` supports default required field checks and custom overrides.
- `hubspotCreateTicket` may require `hs_pipeline_stage` in addition to `subject` depending on ticket pipeline settings in your portal.
- Archive tools (`hubspotArchive*`) use HubSpot object archive semantics (soft delete/archive behavior).
- Batch update tools (`hubspotBatchUpdate*`) support up to 100 records per request.
