# MySQL MCP Server

A Model Context Protocol (MCP) server that integrates with MySQL, enabling Claude to explore databases, run queries, and manage data.

**Built with TypeScript + MCP SDK + mysql2**

---

## Features

- **Schema Exploration**: List databases, tables, describe structure, view statistics
- **Query Execution**: SELECT queries with automatic row limits, INSERT/UPDATE/DELETE/REPLACE/TRUNCATE
- **Query Analysis**: EXPLAIN with TRADITIONAL, TREE (MySQL 8.0+), and JSON formats; EXPLAIN ANALYZE (MySQL 8.0.18+)
- **MySQL-Specific Tools**: Show CREATE TABLE DDL, view active process list
- **Read + Write**: All operations enabled — no access mode restriction
- **Multi-Region / Multi-Version**: Compatible with MySQL 5.7+ and MySQL 8.0+
- **Docker Support**: Multi-platform images (amd64/arm64) with automatic localhost remapping
- **Complete TypeScript**: Strict typing with Zod validation
- **Production Ready**: Error handling, logging, graceful shutdown, stdin monitoring

---

## Available Tools (9)

### Schema Tools
- `mysqlListDatabases` — List all user databases with table count and total size
- `mysqlListTables` — List all tables in a database with engine, row count, and size
- `mysqlDescribeTable` — Full table structure: columns, indexes, foreign keys
- `mysqlGetTableStats` — Table statistics: sizes, AUTO_INCREMENT, engine, collation

### Query Tools
- `mysqlExecuteQuery` — Execute SELECT queries (with automatic LIMIT protection and timeout; `FOR UPDATE` / `LOCK IN SHARE MODE` are not supported)
- `mysqlExecuteWrite` — Execute INSERT/UPDATE/DELETE/REPLACE/TRUNCATE
- `mysqlExplainQuery` — Analyze query execution plans (EXPLAIN / EXPLAIN ANALYZE)

### MySQL-Specific Tools
- `mysqlShowCreateTable` — Output full CREATE TABLE DDL
- `mysqlShowProcessList` — View active connections and running queries

---

## Quick Start

### Prerequisites

- Node.js 18+ or Docker
- MySQL 5.7+ or MySQL 8.0+

### Installation

```bash
cd mcp-mysql
npm install
cp .env.example .env
# Edit .env and set MYSQL_URL
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Docker
docker build -t mcp-mysql:latest .
docker run -i --rm \
  -e MYSQL_URL="mysql://user:password@host:3306/database" \
  mcp-mysql:latest
```

---

## Configuration

### Environment Variables

```bash
# Required
MYSQL_URL=mysql://user:password@localhost:3306/database

# Optional
LOG_LEVEL=INFO                 # DEBUG | INFO | WARN | ERROR | NONE
MYSQL_CONNECT_TIMEOUT=10000    # Connection timeout in ms
MYSQL_QUERY_TIMEOUT=30000      # Default query timeout in ms
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-mysql/dist/index.js"],
      "env": {
        "MYSQL_URL": "mysql://user:password@localhost:3306/database"
      }
    }
  }
}
```

**Using Docker (recommended):**

```json
{
  "mcpServers": {
    "mysql": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--pull=always",
        "-e", "MYSQL_URL",
        "ghcr.io/dunialabs/mcp-servers/mysql:latest"
      ],
      "env": {
        "MYSQL_URL": "mysql://user:password@localhost:3306/database"
      }
    }
  }
}
```

---

## Usage Examples

### List All Databases

```
"Show me all databases"
→ mysqlListDatabases
```

### Describe a Table

```
"Show me the structure of the users table in myapp database"
→ mysqlDescribeTable { database: "myapp", table: "users" }
```

### Run a Query

```
"Find all active users created in the last 7 days"
→ mysqlExecuteQuery {
    query: "SELECT id, email, created_at FROM users WHERE active = ? AND created_at > NOW() - INTERVAL 7 DAY",
    parameters: [1],
    maxRows: 100
  }
```

### Insert Data

```
"Insert a new user with email test@example.com"
→ mysqlExecuteWrite {
    query: "INSERT INTO users (email, created_at) VALUES (?, NOW())",
    parameters: ["test@example.com"]
  }
```

### Analyze a Slow Query

```
"Why is this query slow: SELECT * FROM orders WHERE customer_id = 123"
→ mysqlExplainQuery {
    query: "SELECT * FROM orders WHERE customer_id = 123",
    format: "TREE"
  }
```

### Get Full DDL

```
"Show me the CREATE TABLE statement for the orders table"
→ mysqlShowCreateTable { database: "myapp", table: "orders" }
```

---

## MySQL Version Compatibility

| Feature | MySQL 5.7 | MySQL 8.0 | MySQL 8.0.18+ |
|---|---|---|---|
| All schema tools | ✓ | ✓ | ✓ |
| executeQuery / executeWrite | ✓ | ✓ | ✓ |
| EXPLAIN TRADITIONAL | ✓ | ✓ | ✓ |
| EXPLAIN FORMAT=TREE | ✗ | ✓ | ✓ |
| EXPLAIN FORMAT=JSON | ✓ | ✓ | ✓ |
| EXPLAIN ANALYZE | ✗ | ✗ | ✓ |
| MAX_EXECUTION_TIME hint | ✓ (5.7.8+) | ✓ | ✓ |

---

## Development

| Script | Description |
|---|---|
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Build TypeScript |
| `npm start` | Run built code |
| `npm run clean` | Clean build directory |
| `npm test` | Run tests |
| `npm run lint` | Check code standards |
| `npm run type-check` | TypeScript type checking |

Version source:
- `src/utils/version.ts` reads the package version at runtime so the MCP server reports the same version as `package.json`.

---

## Project Structure

```
mcp-mysql/
├── src/
│   ├── db/
│   │   └── connection.ts        # mysql2 connection pool, singleton
│   ├── tools/
│   │   ├── schema.ts            # listDatabases, listTables, describeTable, getTableStats
│   │   └── query.ts             # executeQuery, executeWrite, explainQuery, showCreateTable, showProcessList
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── utils/
│   │   ├── errors.ts            # MySQL error code mapping
│   │   └── logger.ts            # Logging (stderr only)
│   └── index.ts                 # Entry point, lifecycle management
├── Dockerfile
├── docker-entrypoint.sh
├── build-docker.sh
├── package.json
├── tsconfig.json
└── README.md
```

---

## Security

- **SQL Injection Prevention**: All parameterized queries use mysql2's `execute()` (prepared statement protocol)
- **Query Timeout**: SELECT queries use `MAX_EXECUTION_TIME` hint; write queries acquire a dedicated connection, set `max_execution_time`, and always restore it to `0` in `finally` before returning the connection to the pool
- **Row Limits**: SELECT results automatically capped (default 1000, max 10000)
- **Query Allowlist**: Only permitted SQL verbs are accepted per tool
- **Locking Reads Blocked**: `mysqlExecuteQuery` rejects `FOR UPDATE` and `LOCK IN SHARE MODE` — use `mysqlExecuteWrite` for operations that require row locking
- **No Credentials in Logs**: Connection string is never logged
- **Known Limitation**: Query type detection is based on the leading keyword (`SELECT`, `WITH`, etc.). A `WITH ... AS (...) INSERT ...` CTE containing DML would pass the SELECT check. This is an accepted design trade-off for an AI assistant context where the model constructs queries.

---

## Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [mysql2](https://github.com/sidorares/node-mysql2)
- Based on [mcp-server-template](https://github.com/dunialabs/mcp-servers/tree/main/mcp-server-template)
