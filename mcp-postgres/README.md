# PostgreSQL MCP Server

PostgreSQL MCP Server for database management.

> **Version 1.1.0 - Breaking Change**: Tool names updated to camelCase format (e.g., `postgres_execute_query` → `postgresExecuteQuery`) to follow MCP best practices for better LLM tokenization.

## ✅ Status: Core Features Complete

### ✅ Completed

- [x] Project structure
- [x] TypeScript configuration (strict mode)
- [x] ESLint + Prettier configuration
- [x] Error handling system (MCP standard error codes)
- [x] Logging system (stderr output)
- [x] Database connection management (connection pooling)
- [x] Type definitions (complete TypeScript types)
- [x] Core tool implementation (7 tools)
  - [x] `postgresListSchemas` - List all schemas
  - [x] `postgresListTables` - List tables and views
  - [x] `postgresDescribeTable` - Get table structure
  - [x] `postgresExecuteQuery` - Execute SELECT queries
  - [x] `postgresExecuteWrite` - Execute INSERT/UPDATE/DELETE
  - [x] `postgresExplainQuery` - Analyze execution plans
  - [x] `postgresGetTableStats` - Get table statistics (estimated row count)
- [x] MCP server main file (complete registration)
- [x] Entry point (signal handling + stdin monitoring)
- [x] Docker support (with proper lifecycle management)
  - [x] Multi-stage build
  - [x] dumb-init signal forwarding
  - [x] stdin close detection
  - [x] Non-root user execution

### 🔄 Future Enhancements

- [x] Basic unit tests (errors, logger - 100% coverage)
- [ ] Comprehensive unit tests (tools, database connection)
- [ ] Integration tests
- [x] Publish to GitHub Container Registry (GHCR)
- [ ] Additional tools (index management, table management, data export)

## 📁 Project Structure

```
mcp-postgres/
├── src/
│   ├── db/
│   │   └── connection.ts      # Database connection management (pooling) ✅
│   ├── tools/                 # MCP tool implementations ✅
│   │   ├── schema.ts          # Schema tools (4) ✅
│   │   └── query.ts           # Query tools (3) ✅
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions ✅
│   ├── utils/
│   │   ├── errors.ts          # MCP standard error handling ✅
│   │   └── logger.ts          # Logging utilities ✅
│   ├── server.ts              # MCP server (7 tools registered) ✅
│   └── index.ts               # Entry point (signal handling + stdin monitoring) ✅
├── package.json               # ✅
├── tsconfig.json              # ✅
├── .eslintrc.json             # ✅
├── .prettierrc.json           # ✅
├── .env.example               # ✅
├── .dockerignore              # ✅
├── Dockerfile                 # Multi-stage + dumb-init ✅
├── docker-entrypoint.sh       # Startup script ✅
└── README.md                  # ✅
```

## 🎯 Core Features

### Security First
- ✅ MCP standard error codes (ErrorCode enum)
- ✅ Configurable access mode (readonly / readwrite)
- ✅ Query timeout protection (configurable)
- ✅ Result row limit (default 1000 rows)
- ✅ Parameterized queries (SQL injection prevention)
- ✅ SELECT query validation enforcement
- ✅ Write operation permission checks

### Docker Lifecycle Management
- ✅ dumb-init signal forwarding (SIGTERM/SIGINT)
- ✅ stdin close detection (automatic container cleanup)
- ✅ Graceful shutdown (database connection pool cleanup)
- ✅ Non-root user execution
- ✅ Multi-stage build (small image)

### Performance Optimization
- ✅ Connection pool management (min: 1, max: 5 for single-user scenarios)
- ✅ Optimized queries (JOIN pg_class for table sizes, reltuples for row estimates)
- ✅ Query result formatting (Markdown tables)
- ✅ Enforced LIMIT via subquery wrapping (prevents bypass attacks)

### Developer Experience
- ✅ TypeScript strict mode
- ✅ Complete type definitions
- ✅ Detailed error messages (PostgreSQL error mapping)
- ✅ Structured logging (stderr output)

## 🔧 Installation

```bash
# Install dependencies
npm install

# Build (choose one based on your needs)
npm run build           # Full TypeScript build with type checking (slower, ~2-3 minutes)
npm run build:esbuild   # Fast build with esbuild (recommended for development, ~0.75s)

# Run
npm start
```

### Build Options

This project provides two build options to balance speed and type safety:

#### 🚀 Fast Build (Recommended for Development)
```bash
npm run build:esbuild
```
- **Speed**: ~0.75 seconds
- **Use case**: Local development, quick iterations
- **Transpiler**: esbuild (ultra-fast JavaScript/TypeScript compiler)
- **Type checking**: No (compile only)

#### 🔍 Full Build (Recommended for Production)
```bash
npm run build
```
- **Speed**: 2-3 minutes (due to complex pg library type inference)
- **Use case**: Production releases, CI/CD pipelines
- **Transpiler**: TypeScript compiler (tsc)
- **Type checking**: Yes (full static type analysis)

**Why is tsc slow?**
The PostgreSQL driver (`pg`) uses complex generic types for query results. TypeScript needs significant time to infer and validate these types across all tool implementations. This is expected behavior and doesn't indicate any issues with the code.

**Best Practice**:
- Use `npm run build:esbuild` during development for fast feedback
- Use `npm run build` before committing or in your CI/CD pipeline to ensure type safety

## 🐳 Docker Deployment

```bash
# Build image
docker build -t ghcr.io/dunialabs/mcp-servers/postgres:latest .

# Run
docker run -i --rm \
  -e POSTGRES_URL="postgresql://user:password@localhost:5432/database" \
  -e ACCESS_MODE="readonly" \
  ghcr.io/dunialabs/mcp-servers/postgres:latest
```

## 📝 Claude Desktop Configuration

### Docker Deployment (Recommended)

The Docker image automatically handles localhost remapping across all platforms:
- **MacOS/Windows**: Automatically uses `host.docker.internal`
- **Linux**: Automatically uses `172.17.0.1` or the appropriate host address

Simply use `localhost` in your connection string - no platform-specific configuration needed!

```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--pull=always",
        "-e", "POSTGRES_URL",
        "-e", "ACCESS_MODE",
        "ghcr.io/dunialabs/mcp-servers/postgres:latest"
      ],
      "env": {
        "POSTGRES_URL": "postgresql://user:password@localhost:5432/database",
        "ACCESS_MODE": "readonly"
      }
    }
  }
}
```

**Notes**:
- The Docker image will automatically remap `localhost` to work from inside the container. You can use the same configuration on MacOS, Windows, and Linux without any changes!
- `--pull=always` ensures you always use the latest image from GHCR. For local development with a locally built image, remove this flag.

### Local Development (Node.js)

For local development without Docker:

1. **Build the project**:
```bash
cd /path/to/mcp-postgres
npm install
npm run build
```

2. **Configure in Claude Desktop**:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-postgres/dist/index.js"],
      "env": {
        "POSTGRES_URL": "postgresql://user:password@localhost:5432/database",
        "ACCESS_MODE": "readonly",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

**Note**: For local deployment, you can use `localhost` directly in the connection string since the process runs on your host machine (no Docker networking required).

## 🛡️ Security Best Practices

### Readonly Mode (Recommended)

```bash
export ACCESS_MODE=readonly
export POSTGRES_URL="postgresql://readonly_user:password@localhost:5432/database"
```

### Readwrite Mode (Use with Caution)

```bash
export ACCESS_MODE=readwrite
export POSTGRES_URL="postgresql://admin:pass@localhost:5432/db"
```

⚠️ **Warning**:
- Use readonly mode in production environments
- Readwrite mode should only be used in development/testing
- Always use dedicated database users following the principle of least privilege

## ⚙️ Advanced Configuration

### Connection Pool Settings

The MCP server uses connection pooling for optimal performance. Default settings are optimized for single-user MCP scenarios (Claude Desktop):

**Default Configuration**:
- **Minimum connections**: 1 (keeps one connection warm for fast queries)
- **Maximum connections**: 5 (sufficient for concurrent operations)
- **Idle timeout**: 30 seconds
- **Connection timeout**: 10 seconds

These defaults are suitable for most use cases. For custom requirements, you can configure via connection string parameters:

```bash
# Example: Custom pool configuration
export POSTGRES_URL="postgresql://user:pass@host:5432/db?max=10&idle_timeout=60000"
```

**When to adjust**:
- **Increase max connections** (e.g., 10-20) if you need to handle many concurrent tool calls
- **Decrease to 3** if you have strict database connection limits
- **Increase idle timeout** if your database charges per new connection

### Query Limits and Timeouts

**Query Execution Limits**:
- Default row limit: 1,000 rows (max: 10,000)
- Default timeout: 30 seconds (max: 5 minutes)
- LIMIT is enforced via subquery wrapping (cannot be bypassed)

**Performance Tips**:
- Use `postgresGetTableStats` to check table size before querying
- Row count returned by `getTableStats` is an estimate (fast) - use `COUNT(*)` query for exact count
- Large result sets (>1000 rows) are automatically limited for performance

## 🛠️ Available Tools

mcp-postgres provides 7 tools for PostgreSQL database management:

### Schema Management Tools

1. **postgresListSchemas** - List all user schemas
2. **postgresListTables** - List tables in a specified schema
3. **postgresDescribeTable** - Get detailed table structure (columns, indexes, constraints)
4. **postgresGetTableStats** - Get table statistics (estimated row count, size, etc.)

### Query Tools

5. **postgresExecuteQuery** - Execute SELECT queries (readonly, auto-adds LIMIT)
6. **postgresExecuteWrite** - Execute INSERT/UPDATE/DELETE (requires readwrite mode)
7. **postgresExplainQuery** - Analyze query execution plans (EXPLAIN)

## 📚 Usage Examples

### Local Execution

```bash
# Set environment variables
export POSTGRES_URL="postgresql://user:password@localhost:5432/mydb"
export ACCESS_MODE="readonly"
export LOG_LEVEL="INFO"

# Run server
npm start
```

### Docker Execution

```bash
docker run -i --rm \
  -e POSTGRES_URL="postgresql://user:password@localhost:5432/db" \
  -e ACCESS_MODE="readonly" \
  ghcr.io/dunialabs/mcp-servers/postgres:latest
```

**Note**: `localhost` is automatically remapped to work in Docker:
- MacOS/Windows: `localhost` → `host.docker.internal`
- Linux: `localhost` → `172.17.0.1` (or gateway IP)

### Claude Desktop Usage Examples

After successful connection, you can use Claude like this:

```
# List all schemas
Please list all schemas in the database

# View table structure
Please describe the structure of the users table

# Execute query
Query the last 10 users: SELECT * FROM users ORDER BY created_at DESC LIMIT 10

# Analyze query performance
Analyze the execution plan for this query: SELECT * FROM orders WHERE user_id = 123
```

## 🛠️ Development

### Version Management

This project uses **package.json as the single source of truth** for version numbers. All other files automatically read the version from package.json:

- **src/server.ts**: Reads version at runtime using `readFileSync`
- **build-docker.sh**: Reads version using `node -p "require('./package.json').version"`
- **Dockerfile**: Receives version via `--build-arg VERSION` during build

**To update the version**:
1. Edit the `version` field in `package.json`
2. Rebuild: `npm run build`
3. All components will automatically use the new version

**Example**:
```bash
# Update version in package.json
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Rebuild
npm run build

# Build Docker image (automatically uses new version)
./build-docker.sh
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License

---

## 🔗 Related Links

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 🌟 Project Highlights

### Key Differences from crystaldba/postgres-mcp

1. **Proper Docker Lifecycle Management**
   - Implemented stdin close detection for automatic container cleanup when Claude exits
   - Uses dumb-init for proper signal forwarding
   - Graceful shutdown with database connection pool cleanup

2. **MCP Standard Error Handling**
   - Uses official ErrorCode enum
   - PostgreSQL error code mapping (42P01, 42501, 57014, etc.)
   - Detailed error context information

3. **Code Quality**
   - TypeScript strict mode
   - Complete type definitions
   - Connection pool management
   - Structured logging (stderr)
   - Non-root user execution

4. **Developer Friendly**
   - Clear project structure
   - Detailed code comments
   - Follows MCP best practices
   - Easy to extend and maintain

---

**Status**: ✅ Core Features Complete
**Author**: PETA Team
**License**: MIT
