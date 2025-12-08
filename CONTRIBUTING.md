# Contributing to Peta MCP Servers

Thank you for your interest in contributing to Peta MCP Servers! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Creating a New MCP Server](#creating-a-new-mcp-server)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Reporting Issues](#reporting-issues)
- [License](#license)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git
- Docker (optional, for testing containerized servers)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone git@github.com:YOUR_USERNAME/mcp-servers.git
   cd mcp-servers
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/dunialabs/mcp-servers.git
   ```

### Install Dependencies

```bash
# Install dependencies for all servers
npm run install:all

# Or install for a specific server
cd mcp-google-drive
npm install
```

## How to Contribute

### Types of Contributions

- **Bug fixes**: Fix issues in existing MCP servers
- **New features**: Add new functionality to existing servers
- **New MCP servers**: Create a new MCP server integration
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Code quality**: Refactoring, performance improvements

## Development Workflow

1. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes** following our code style guidelines

3. **Test your changes**:
   ```bash
   # Run tests for all servers (skips packages without a test script)
   npm run test:all

   # Or test a specific server
   cd mcp-google-drive
   npm test
   ```

4. **Build the project**:
   ```bash
   # Build all servers
   npm run build:all

   # Or build a specific server
   cd mcp-google-drive
   npm run build
   ```

5. **Commit your changes** following our commit message guidelines

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** from your fork to the main repository

## Code Style Guidelines

This project uses ESLint and Prettier to maintain consistent code style.

### TypeScript

- Use TypeScript for all source code
- Enable strict type checking
- Avoid using `any` type when possible
- Document complex types and interfaces

### Code Formatting

We use Prettier with the following configuration:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Linting

Run ESLint before committing:

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Naming Conventions

- **Files**: Use kebab-case (e.g., `google-drive-client.ts`)
- **Classes**: Use PascalCase (e.g., `GoogleDriveClient`)
- **Functions/Variables**: Use camelCase (e.g., `getUserProfile`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces/Types**: Use PascalCase (e.g., `FileMetadata`)

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD configuration changes

### Examples

```
feat(google-drive): add support for shared drives

Implement shared drive listing and file access for Google Drive MCP server.
Includes new tools for managing shared drive permissions.

Closes #123
```

```
fix(postgres): prevent SQL injection in query builder

Sanitize user input before constructing SQL queries to prevent
potential SQL injection vulnerabilities.
```

```
docs(readme): update installation instructions

Add Docker installation steps and clarify environment variable
configuration for all MCP servers.
```

## Pull Request Process

1. **Update documentation** if you've changed APIs or added features
2. **Add tests** for new functionality
3. **Ensure all tests pass** (`npm run test:all`)
4. **Ensure the build succeeds** (`npm run build:all`)
5. **Update the README.md** if adding a new server or major feature
6. **Follow the PR template** (if available)
7. **Request review** from maintainers

### PR Title Format

Use the same format as commit messages:

```
feat(notion): add block deletion tool
fix(postgres): resolve connection pool leak
docs: improve contributing guidelines
```

### PR Description Checklist

- [ ] Description of changes
- [ ] Related issue(s) referenced
- [ ] Breaking changes noted (if any)
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] Screenshots/examples (if applicable)

## Testing

### Writing Tests

- Place tests in `src/__tests__/` or alongside source files as `*.test.ts`
- Use descriptive test names
- Test both success and error cases
- Mock external API calls

### Running Tests

```bash
# Run all available tests (skips packages without a test script)
npm run test:all

# Run tests for a specific server
cd mcp-google-drive
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Creating a New MCP Server

To create a new MCP server in this repository:

1. **Copy the template**:
   ```bash
   cp -r mcp-server-template mcp-your-service
   cd mcp-your-service
   ```

2. **Follow the checklist**:
   - Read `NEW_PROJECT_CHECKLIST.md`
   - Read `TEMPLATE_GUIDE.md`

3. **Update package.json**:
   - Change package name
   - Update description
   - Update author and repository URLs

4. **Implement your server**:
   - Define tools in `src/tools/`
   - Implement client logic in `src/`
   - Add authentication handling in `src/auth/`

5. **Add documentation**:
   - Update server's README.md
   - Add usage examples
   - Document all tools and configuration options

6. **Create LICENSE file**:
   ```bash
   cp ../LICENSE ./LICENSE
   ```

7. **Add Docker support**:
   - Create `Dockerfile`
   - Test Docker build locally

8. **Update main README**:
   - Add your server to the "Available Servers" section
   - Update repository structure diagram

9. **Submit PR** with your new server

## Security Vulnerabilities

If you discover a security vulnerability or critical security bug, please **DO NOT** open a public issue.

Instead, please report it privately to:

**Email**: support@dunialabs.io

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your email within 48 hours and work with you to address the issue promptly.

## Reporting Issues

### Before Creating an Issue

- Search existing issues to avoid duplicates
- Verify the issue is reproducible
- Gather relevant information (error messages, logs, environment)
- **For security issues**: Email support@dunialabs.io instead

### Issue Template

```markdown
**Description**
A clear description of the issue.

**Steps to Reproduce**
1. Step one
2. Step two
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- Node.js version:
- npm version:
- Operating System:
- MCP Server:
- Docker version (if applicable):

**Additional Context**
Screenshots, logs, or other relevant information.
```

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `question`: Further information requested

## License

By contributing to Peta MCP Servers, you agree that your contributions will be licensed under the MIT License.

All contributions must include:
- The MIT License header in new files
- Copyright (c) 2025 Dunia Labs, Inc.

See the [LICENSE](LICENSE) file for the full license text.

## Questions?

If you have questions about contributing, please:
- Open an issue on GitHub: https://github.com/dunialabs/mcp-servers/issues
- Use the `question` label for support requests
- Reach out to the maintainers

Thank you for contributing to Peta MCP Servers!
