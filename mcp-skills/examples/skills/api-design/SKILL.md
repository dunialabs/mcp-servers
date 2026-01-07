---
name: api-design
description: RESTful API design best practices including resource naming, HTTP methods, status codes, filtering, pagination, authentication, and OpenAPI documentation. Use when designing or reviewing REST APIs, web APIs, or API endpoints.
version: 1.0.0
---

# API Design Best Practices

This skill provides comprehensive guidelines for designing clean, consistent, and developer-friendly RESTful APIs.

## Resource Naming

### URL Structure

**Use nouns, not verbs:**

```
✅ Good:
GET    /users
GET    /users/123
POST   /users
PUT    /users/123
DELETE /users/123

❌ Bad:
GET    /getUsers
POST   /createUser
POST   /updateUser/123
POST   /deleteUser/123
```

### Naming Conventions

1. **Use plural nouns** for collections:
   ```
   ✅ /users, /products, /orders
   ❌ /user, /product, /order
   ```

2. **Use lowercase** and **hyphens** for multi-word resources:
   ```
   ✅ /user-profiles, /order-items
   ❌ /UserProfiles, /order_items
   ```

3. **Nested resources** for relationships:
   ```
   ✅ /users/123/orders
   ✅ /posts/456/comments
   ✅ /products/789/reviews
   ```

4. **Limit nesting depth** (max 2 levels):
   ```
   ✅ /users/123/orders/456
   ❌ /users/123/orders/456/items/789/details

   Instead use:
   ✅ /order-items/789
   ```

## HTTP Methods

### Standard CRUD Operations

| Method | Action | Example | Response |
|--------|--------|---------|----------|
| GET | Retrieve | `GET /users` | 200 + list |
| GET | Retrieve one | `GET /users/123` | 200 + resource |
| POST | Create | `POST /users` | 201 + resource |
| PUT | Update (full) | `PUT /users/123` | 200 + resource |
| PATCH | Update (partial) | `PATCH /users/123` | 200 + resource |
| DELETE | Delete | `DELETE /users/123` | 204 (no content) |

### When to Use Each Method

**GET - Retrieve data:**
```http
GET /users?page=1&limit=10
GET /users/123
GET /users/123/orders

Response: 200 OK
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**POST - Create new resource:**
```http
POST /users
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}

Response: 201 Created
Location: /users/124
{
  "id": 124,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "createdAt": "2024-01-06T10:00:00Z"
}
```

**PUT - Replace entire resource:**
```http
PUT /users/123
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890"
}

Response: 200 OK
{
  "id": 123,
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "updatedAt": "2024-01-06T10:00:00Z"
}
```

**PATCH - Update specific fields:**
```http
PATCH /users/123
Content-Type: application/json

{
  "phone": "+1234567890"
}

Response: 200 OK
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "updatedAt": "2024-01-06T10:00:00Z"
}
```

**DELETE - Remove resource:**
```http
DELETE /users/123

Response: 204 No Content
```

## HTTP Status Codes

### Success Codes (2xx)

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 202 | Accepted | Request accepted for async processing |
| 204 | No Content | Successful DELETE (no response body) |

### Client Error Codes (4xx)

| Code | Meaning | Use Case |
|------|---------|----------|
| 400 | Bad Request | Invalid request body/parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Error Codes (5xx)

| Code | Meaning | Use Case |
|------|---------|----------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Invalid upstream response |
| 503 | Service Unavailable | Server overloaded/maintenance |
| 504 | Gateway Timeout | Upstream timeout |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      },
      {
        "field": "age",
        "message": "Age must be greater than 0"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

## Request and Response Format

### Request Body (POST/PUT/PATCH)

```json
POST /users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "country": "USA"
  }
}
```

### Response Body Format

**Single resource:**
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-06T10:00:00Z",
  "updatedAt": "2024-01-06T10:00:00Z"
}
```

**Collection (with pagination):**
```json
{
  "data": [
    {
      "id": 123,
      "name": "John Doe"
    },
    {
      "id": 124,
      "name": "Jane Smith"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalPages": 5,
    "totalItems": 48
  },
  "links": {
    "self": "/users?page=1&limit=10",
    "next": "/users?page=2&limit=10",
    "prev": null,
    "first": "/users?page=1&limit=10",
    "last": "/users?page=5&limit=10"
  }
}
```

## Filtering, Sorting, and Pagination

### Filtering

```http
# Single filter
GET /users?status=active

# Multiple filters
GET /users?status=active&role=admin

# Range filters
GET /products?price_min=10&price_max=100

# Date filters
GET /orders?created_after=2024-01-01&created_before=2024-12-31

# Search
GET /users?q=john
```

### Sorting

```http
# Sort ascending
GET /users?sort=name

# Sort descending
GET /users?sort=-name

# Multiple sorts
GET /users?sort=name,-createdAt
```

### Pagination

**Offset-based pagination:**
```http
GET /users?page=2&limit=10
GET /users?offset=10&limit=10
```

**Cursor-based pagination (better for large datasets):**
```http
GET /users?cursor=eyJpZCI6MTIzfQ&limit=10

Response:
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTMzfQ",
    "prevCursor": "eyJpZCI6MTEzfQ",
    "hasMore": true
  }
}
```

## Field Selection

**Sparse fieldsets:**
```http
# Only specific fields
GET /users?fields=id,name,email

# Exclude fields
GET /users?exclude=password,ssn
```

**Nested resource expansion:**
```http
# Default
GET /orders/123
{
  "id": 123,
  "userId": 456
}

# With expansion
GET /orders/123?expand=user
{
  "id": 123,
  "user": {
    "id": 456,
    "name": "John Doe"
  }
}
```

## Versioning

### URL Versioning (Recommended)

```http
GET /v1/users
GET /v2/users
```

**Pros:**
- Easy to understand
- Easy to route
- Easy to deprecate old versions

### Header Versioning

```http
GET /users
Accept: application/vnd.api+json; version=1
```

### Versioning Best Practices

1. **Major version in URL**, minor in header
2. **Don't break existing APIs** without version bump
3. **Support old versions** for reasonable time (6-12 months)
4. **Deprecation headers** to warn clients:
   ```http
   Deprecation: Sun, 01 Jan 2025 00:00:00 GMT
   Sunset: Sun, 01 Jul 2025 00:00:00 GMT
   Link: <https://api.example.com/v2/users>; rel="successor-version"
   ```

## Authentication and Authorization

### Authentication Methods

**1. API Key (Simple):**
```http
GET /users
X-API-Key: sk_live_abc123def456
```

**2. Bearer Token (OAuth 2.0):**
```http
GET /users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**3. Basic Auth (Legacy):**
```http
GET /users
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

### Authorization Levels

**Resource-level permissions:**
```http
# User can only access their own data
GET /users/me/orders

# Admin can access all users
GET /users/123/orders
```

**Scope-based permissions:**
```http
# Token with limited scope
Authorization: Bearer token_with_read_scope
GET /users  # ✅ Allowed

Authorization: Bearer token_with_read_scope
POST /users  # ❌ 403 Forbidden
```

## Rate Limiting

### Response Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1609459200
Retry-After: 3600
```

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 1 hour.",
    "retryAfter": 3600
  }
}
```

## Security Best Practices

### 1. Always Use HTTPS

```
✅ https://api.example.com/users
❌ http://api.example.com/users
```

### 2. Validate Input

```javascript
// Server-side validation
function createUser(req, res) {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      error: { message: 'Invalid email address' }
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({
      error: { message: 'Password must be at least 8 characters' }
    });
  }

  // Create user...
}
```

### 3. Sanitize Output

```javascript
// Don't expose sensitive data
function getUser(req, res) {
  const user = db.findUser(req.params.id);

  // ❌ Bad - exposes password
  res.json(user);

  // ✅ Good - excludes sensitive fields
  const { password, ssn, ...safeUser } = user;
  res.json(safeUser);
}
```

### 4. Use CORS Properly

```javascript
// Configure CORS
app.use(cors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

### 5. Prevent Common Attacks

- **SQL Injection**: Use parameterized queries
- **XSS**: Sanitize input, escape output
- **CSRF**: Use CSRF tokens
- **DoS**: Implement rate limiting
- **Mass Assignment**: Whitelist allowed fields

## Documentation

### OpenAPI (Swagger) Specification

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
          format: email
```

### Example Documentation Elements

1. **Description**: What the endpoint does
2. **Authentication**: Required auth method
3. **Parameters**: Query, path, header params
4. **Request body**: Schema and examples
5. **Response**: Status codes and examples
6. **Errors**: Possible error responses
7. **Rate limits**: Limits and quotas
8. **Examples**: cURL, JavaScript, Python examples

## Testing

### Example Tests

```javascript
describe('GET /users', () => {
  it('should return list of users', async () => {
    const response = await request(app)
      .get('/users')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });

  it('should filter by status', async () => {
    const response = await request(app)
      .get('/users?status=active')
      .expect(200);

    response.body.data.forEach(user => {
      expect(user.status).toBe('active');
    });
  });

  it('should return 401 without auth', async () => {
    await request(app)
      .get('/users')
      .expect(401);
  });
});
```

## API Design Checklist

- [ ] RESTful resource naming (plural nouns)
- [ ] Appropriate HTTP methods
- [ ] Correct status codes
- [ ] Consistent error format
- [ ] Pagination for collections
- [ ] Filtering and sorting support
- [ ] Field selection
- [ ] API versioning strategy
- [ ] Authentication/authorization
- [ ] Rate limiting
- [ ] HTTPS only
- [ ] Input validation
- [ ] CORS configuration
- [ ] Comprehensive documentation
- [ ] Example requests/responses
- [ ] Error handling
- [ ] Idempotency for unsafe methods
- [ ] Request/response compression
- [ ] Caching headers
- [ ] API testing

## Resources

- [REST API Tutorial](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [API Design Patterns](https://microservice-api-patterns.org/)
- [OAuth 2.0](https://oauth.net/2/)
