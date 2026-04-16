# Stripe MCP Server

A Model Context Protocol (MCP) server that integrates with Stripe API, enabling Claude to process payments, manage customers, handle subscriptions, and perform billing operations.

**Built with TypeScript + MCP SDK + Stripe SDK**

---

## ✨ Features

- 💳 **Payment Processing**: Create, confirm, and cancel payment intents
- 👥 **Customer Management**: Create, update, delete, and list customers
- 💰 **Refund Operations**: Process full and partial refunds
- 📦 **Product Catalog**: Manage products and pricing models
- 🔄 **Subscription Management**: Recurring billing and subscription lifecycle
- 🔐 **Dual Authentication**: Platform keys + Stripe Connect support
- 🛡️ **Security First**: PCI DSS compliant (no card data handling), idempotency support
- 🐳 **Docker Support**: Multi-platform images (amd64/arm64)
- 📝 **Complete TypeScript**: Strict typing with Zod validation
- 🚀 **Production Ready**: Error handling, logging, audit trail
- 🖥️ **MCP Apps Views**: Visual customer, payment, and invoice views for supported clients

---

## 📋 Available Tools (29)

### Quick Reference

| Category | Tools | Purpose |
|----------|-------|---------|
| **Payments** | 6 | One-time payments and invoice browsing |
| **Customers** | 5 | Customer data management |
| **Refunds** | 3 | Payment refunds and reversals |
| **Products** | 5 | Product catalog management |
| **Prices** | 4 | Pricing models (one-time & recurring) |
| **Subscriptions** | 6 | Recurring billing & subscription lifecycle |

### Payment Tools (6)
- `stripeCreatePaymentIntent` - Create a payment intent for processing payments
- `stripeConfirmPaymentIntent` - Confirm a payment intent to complete payment
- `stripeCancelPaymentIntent` - Cancel a payment intent before completion
- `stripeGetPaymentIntent` - Retrieve payment intent details by ID
- `stripeListPaymentIntents` - List payment intents (filter by customer, limit, pagination)
- `stripeListInvoices` - List invoices (filter by customer, status, limit, pagination)

### Customer Tools (5)
- `stripeCreateCustomer` - Create a new customer record
- `stripeGetCustomer` - Retrieve customer details by ID
- `stripeUpdateCustomer` - Update customer information
- `stripeListCustomers` - List customers with optional filters
- `stripeDeleteCustomer` - Delete a customer record

### MCP Apps Views

Supported clients can render visual views for:

- `stripeListCustomers`
- `stripeListPaymentIntents`
- `stripeListInvoices`
- `stripeGetCustomer`

These tools keep the original text/JSON fallback for non-Apps clients and add structured content for App-aware hosts.

### Refund Tools (3)
- `stripeCreateRefund` - Create a full or partial refund
- `stripeGetRefund` - Retrieve refund details by ID
- `stripeListRefunds` - List refunds with filters

### Product Tools (5)
- `stripeCreateProduct` - Create a new product in the catalog
- `stripeGetProduct` - Retrieve product details by ID
- `stripeUpdateProduct` - Update product information
- `stripeListProducts` - List all products with filters
- `stripeDeleteProduct` - Delete a product

### Price Tools (4)
- `stripeCreatePrice` - Create a price for one-time or recurring billing
- `stripeGetPrice` - Retrieve price details by ID
- `stripeUpdatePrice` - Update price metadata or active status
- `stripeListPrices` - List prices with filters

### Subscription Tools (6)
- `stripeCreateSubscription` - Create a new subscription for recurring billing
- `stripeGetSubscription` - Retrieve subscription details by ID
- `stripeUpdateSubscription` - Update subscription items or metadata
- `stripeCancelSubscription` - Cancel a subscription (immediate or at period end)
- `stripeResumeSubscription` - Resume a paused subscription
- `stripeListSubscriptions` - List subscriptions with filters

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ or Docker
- Stripe account with API keys ([Get API keys](https://dashboard.stripe.com/apikeys))

### Installation

```bash
# Clone or navigate to the project
cd mcp-stripe

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your Stripe secret key
```

### Running the Server

#### Option 1: Development Mode

```bash
npm run dev
```

#### Option 2: Production Build

```bash
npm run build
npm start
```

`npm run build` now includes `npm run build:app`, which generates the MCP Apps HTML resources under `dist/ui/ui/`.

#### Option 3: Docker

```bash
# Build Docker image
docker build -t mcp-stripe:latest .

# Run with Docker
docker run -i --rm \
  -e STRIPE_SECRET_KEY="sk_test_xxx" \
  mcp-stripe:latest
```

---

## 🔐 Authentication

This server supports two authentication modes:

### Platform Mode (Default)

Use your Stripe platform secret key:

```bash
STRIPE_SECRET_KEY=sk_test_51xxxxx  # Test mode
# or
STRIPE_SECRET_KEY=sk_live_51xxxxx  # Live mode (production)
```

### Stripe Connect Mode

For operating on connected accounts:

```bash
STRIPE_SECRET_KEY=sk_test_51xxxxx  # or Connect access_token
STRIPE_ACCOUNT=acct_xxxxx           # Connected account ID
```

**Security Note:** The server automatically detects test vs live mode and logs appropriate warnings.

### Runtime Token Updates

This server also supports runtime token updates from Core via:

- `notifications/token/update`
  - `accessToken` or `token`

Updated Stripe keys are normalized before use:

- Leading/trailing whitespace is trimmed
- Optional `Bearer ` prefix is removed

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
STRIPE_SECRET_KEY=sk_test_51xxxxx

# Optional - Stripe Connect
STRIPE_ACCOUNT=acct_xxxxx

# Optional - API Version (default: 2024-06-20)
# Latest stable: 2025-12-15.clover, but 2024-06-20 is well-tested and stable
STRIPE_API_VERSION=2024-06-20

# Optional - Logging
LOG_LEVEL=info                 # debug, info, warn, error
NODE_ENV=production            # development, production
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "stripe": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-stripe/dist/stdio.js"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_51xxxxx"
      }
    }
  }
}
```

For development mode with hot reload:

```json
{
  "mcpServers": {
    "stripe-dev": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-stripe/src/stdio.ts"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_51xxxxx",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

**Using Docker** (recommended for production):

```json
{
  "mcpServers": {
    "stripe": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "STRIPE_SECRET_KEY",
        "ghcr.io/dunialabs/mcp-servers/stripe:latest"
      ],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_xxx"
      }
    }
  }
}
```

Or use local Docker image:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "STRIPE_SECRET_KEY",
        "-e", "LOG_LEVEL=info",
        "mcp-stripe:latest"
      ],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_xxx"
      }
    }
  }
}
```

**Notes**:
- Replace `sk_test_51xxxxx` with your actual Stripe secret key
- For Node.js mode, use absolute paths (not `~` or relative paths)
- Docker mode provides better isolation and easier deployment

Restart Claude Desktop after configuration.

---

## 📖 Usage Examples

### Create a Payment

```typescript
// Ask Claude:
"Create a payment intent for $50 USD for customer cus_xxx"

// Claude will call:
{
  "name": "stripeCreatePaymentIntent",
  "arguments": {
    "amount": 5000,        // $50.00 in cents
    "currency": "usd",
    "customer": "cus_xxx",
    "description": "Payment for services"
  }
}
```

### Create a Customer

```typescript
// Ask Claude:
"Create a Stripe customer for john@example.com named John Doe"

// Claude will call:
{
  "name": "stripeCreateCustomer",
  "arguments": {
    "email": "john@example.com",
    "name": "John Doe",
    "description": "Customer for John Doe"
  }
}
```

### Process a Refund

```typescript
// Ask Claude:
"Refund payment intent pi_xxx for $25"

// Claude will call:
{
  "name": "stripeCreateRefund",
  "arguments": {
    "payment_intent": "pi_xxx",
    "amount": 2500,        // $25.00 partial refund
    "reason": "requested_by_customer"
  }
}
```

### List Recent Payments

```typescript
// Ask Claude:
"Show me the last 10 payments for customer cus_xxx"

// Claude will call:
{
  "name": "stripeListPaymentIntents",
  "arguments": {
    "customer": "cus_xxx",
    "limit": 10
  }
}

// Note: Stripe API does not support status filtering on the list endpoint.
// To filter by status (e.g., only succeeded payments), you'll need to
// filter the results client-side after retrieval.
```

### Create a Product and Price

```typescript
// Ask Claude:
"Create a product called 'Premium Plan' with a monthly price of $29.99"

// Claude will first create the product:
{
  "name": "stripeCreateProduct",
  "arguments": {
    "name": "Premium Plan",
    "description": "Monthly premium subscription"
  }
}

// Then create a recurring price:
{
  "name": "stripeCreatePrice",
  "arguments": {
    "product_id": "prod_xxx",
    "unit_amount": 2999,     // $29.99 in cents
    "currency": "usd",
    "recurring": {
      "interval": "month"
    }
  }
}
```

### Create a Subscription

```typescript
// Ask Claude:
"Create a monthly subscription for customer cus_xxx using price price_xxx with a 7-day trial"

// Claude will call:
{
  "name": "stripeCreateSubscription",
  "arguments": {
    "customer_id": "cus_xxx",
    "items": [
      {
        "price": "price_xxx",
        "quantity": 1
      }
    ],
    "trial_period_days": 7
  }
}
```

### Cancel a Subscription

```typescript
// Ask Claude:
"Cancel subscription sub_xxx at the end of the current billing period"

// Claude will call:
{
  "name": "stripeCancelSubscription",
  "arguments": {
    "subscription_id": "sub_xxx",
    "prorate": false
  }
}
```

### Resume a Paused Subscription

```typescript
// Ask Claude:
"Resume subscription sub_xxx"

// Claude will call:
{
  "name": "stripeResumeSubscription",
  "arguments": {
    "subscription_id": "sub_xxx"
  }
}

// Note: This resumes subscriptions that have pause_collection set.
// For subscriptions with status="paused", see Stripe's /resume endpoint documentation.
```

---

## 🛡️ Security & Compliance

### PCI DSS Compliance

- ✅ **No Card Data Handling**: Server never accepts raw card numbers or CVV codes
- ✅ **Payment Method IDs Only**: Use `payment_method_id` created by Stripe.js on frontend
- ✅ **Secure Tokens**: All sensitive data uses Stripe's tokenization

### Idempotency Support

All write operations support idempotency keys for safe retries:

```typescript
{
  "name": "stripeCreatePaymentIntent",
  "arguments": {
    "amount": 1000,
    "currency": "usd",
    "idempotency_key": "unique-key-123"  // Prevents duplicate charges
  }
}
```

### Connect Mode Safety

- Write operations require `STRIPE_ACCOUNT` in Connect mode to prevent accidental platform operations
- Automatic validation and warnings for missing account context
- Full audit logging with sensitive data redaction

### Data Protection

- All logs automatically sanitize sensitive fields (keys, tokens, card data)
- Structured JSON logging to stderr (STDIO compatible)
- Environment-based configuration prevents credential leaks

---

## ⚠️ API Limitations

### Payment Intent List Filtering

**Note**: The Stripe API does not support status filtering on the `list` endpoint.

**Not Supported**:
```typescript
// ❌ Status filtering not available
stripeListPaymentIntents({ status: "succeeded" })
```

**Workaround**: Retrieve all payment intents and filter client-side:
```typescript
// ✅ Retrieve all, then filter in your application
const intents = await stripeListPaymentIntents({ customer: "cus_xxx", limit: 100 });
const succeeded = intents.data.filter(pi => pi.status === 'succeeded');
```

**Available Filters**:
- `customer` - Filter by customer ID
- `limit` - Number of results (1-100)
- `starting_after` - Cursor for pagination

For more information, see [Stripe API: List Payment Intents](https://docs.stripe.com/api/payment_intents/list)

### Minimum Charge Amounts by Currency

⚠️ **IMPORTANT**: This server does **NOT** validate minimum charge amounts. Here's why:

#### Why No Client-Side Validation?

Minimum amounts depend on **multiple factors** that we cannot predict:

1. **Settlement Currency**: If your Stripe account settles in USD but you charge in GBP, the amount is converted
2. **Account Settings**: Your account may have custom minimums (e.g., $4.00 instead of $0.50)
3. **Exchange Rates**: Real-time conversion rates affect whether amounts meet minimums
4. **Payment Method**: Some payment methods have different minimums

**Result**: Client-side validation would give false positives or false negatives.

#### Stripe API Handles Validation

Instead, Stripe API will return **accurate error messages** that include:
- The exact minimum required for your account
- Currency conversion details
- Settlement currency information

**Example Stripe Error**:
```
Amount must convert to at least 400 cents. £0.30 converts to approximately $3.15.
```

This tells you:
- Your account requires minimum **$4.00 USD**
- £0.30 converts to ~$3.15
- You need to increase the amount

#### Standard Minimums (Reference Only)

| Currency | Stripe Standard | Notes |
|----------|----------------|-------|
| **USD** 🇺🇸 | $0.50 (50 cents) | Your account may differ |
| **EUR** 🇪🇺 | €0.50 (50 cents) | Your account may differ |
| **GBP** 🇬🇧 | £0.30 (30 pence) | Your account may differ |
| **JPY** 🇯🇵 | ¥50 | Your account may differ |
| **CNY** 🇨🇳 | ¥3.00 (300 fen) | Your account may differ |

⚠️ These are **Stripe's standard minimums**. Your actual minimums may be higher due to:
- Settlement currency conversion
- Custom account configuration
- Regional requirements

#### Best Practices

**Option 1: Safe Amounts** (Recommended)
```typescript
// Use amounts that work for most accounts
{ amount: 500, currency: "usd" }   // $5.00 - safe
{ amount: 500, currency: "gbp" }   // £5.00 - safe
{ amount: 500, currency: "eur" }   // €5.00 - safe
```

**Option 2: Test Small Amounts**
```typescript
// Try small amounts and handle errors gracefully
{ amount: 100, currency: "usd" }   // $1.00 - may work
// If Stripe rejects it, error message will tell you the minimum
```

**Option 3: Check Stripe Dashboard**
- Go to [Stripe Dashboard](https://dashboard.stripe.com)
- Settings → Account details → Settlement currency
- Check your minimum charge settings

#### Amount Units

- **Decimal currencies** (USD, EUR, GBP, CNY): Use smallest unit (cents/pence/fen)
- **Zero-decimal currencies** (JPY): Use actual amount (yen)

**Maximum Amount**: All currencies support up to 8 digits (e.g., $999,999.99 for USD)

---

## 🧪 Testing

### Using Stripe Test Mode

Always test with test keys before going live:

```bash
STRIPE_SECRET_KEY=sk_test_51xxxxx npm test
```

### Test Cards

Stripe provides test card numbers for development:

- Success: `4242424242424242`
- Decline: `4000000000000002`
- Requires Authentication: `4000002500003155`

See full list: https://stripe.com/docs/testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests (requires test API key)
STRIPE_SECRET_KEY=sk_test_xxx npm run test:integration

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 🐛 Troubleshooting

### Missing API Key

```
Error: STRIPE_SECRET_KEY environment variable is required
```

**Solution**: Set the `STRIPE_SECRET_KEY` environment variable to your Stripe secret key.

### Invalid API Key Format

```
Error: STRIPE_SECRET_KEY must be a valid Stripe secret key
```

**Solution**: Ensure your key starts with `sk_test_` or `sk_live_`.

### Rate Limiting

Stripe enforces rate limits:
- Standard: 100 req/sec per API key
- Can be increased for high-volume accounts

**Solution**: Implement retry logic with exponential backoff if hitting limits.

### Connect Account Issues

```
Warning: Write operation executing without STRIPE_ACCOUNT
```

**Solution**: Set `STRIPE_ACCOUNT` environment variable when operating on connected accounts.

### Empty Options Object Error

```
Error: Stripe: Unknown arguments ([object Object]). Did you mean to pass an options object?
```

**Cause**: This error occurred in earlier versions when passing empty options to Stripe API.

**Solution**: Update to latest version - this has been fixed. Empty options are no longer passed to Stripe SDK.

### Status Filtering Not Working

**Issue**: Trying to filter payment intents by status returns all results.

**Cause**: Stripe API does not support status filtering on the list endpoint.

**Solution**: See [API Limitations](#️-api-limitations) section for workarounds.

### Amount Conversion Error

**Error**:
```
Amount must convert to at least 400 cents. £0.30 converts to approximately $3.15.
```

**Cause**: Your Stripe account settlement currency requires a minimum that the charge amount doesn't meet after currency conversion.

**Common Reasons**:
1. **Custom account minimum**: Your account has a higher minimum (e.g., $4.00) than Stripe's standard ($0.50)
2. **Settlement currency mismatch**: Charging in GBP but settling in USD
3. **Currency conversion**: The converted amount is below the settlement currency minimum

**Solutions**:

1. **Check your Stripe Dashboard**:
   - Go to Settings → Account details → Settlement currency
   - Check if you have custom minimum amounts set

2. **Increase the charge amount**:
   ```typescript
   // If your account minimum is $4.00 USD:
   { amount: 400, currency: "usd" }    // $4.00
   { amount: 350, currency: "gbp" }    // £3.50 ≈ $4.40
   { amount: 400, currency: "eur" }    // €4.00 ≈ $4.30
   ```

3. **Use your settlement currency**: If settling in USD, charge in USD to avoid conversion

4. **Contact Stripe Support**: If you believe your minimum is incorrect

---

## 📊 API Coverage

### Currently Implemented (28 tools)
- ✅ Payment Intents (5 tools) - One-time payments
- ✅ Customers (5 tools) - Customer management
- ✅ Refunds (3 tools) - Payment refunds
- ✅ Products (5 tools) - Product catalog
- ✅ Prices (4 tools) - Pricing models (one-time & recurring)
- ✅ Subscriptions (6 tools) - Recurring billing

### Planned for Future Versions (14 tools)
- 📅 Invoices (6 tools)
- 📅 Payment Methods (4 tools)
- 📅 Balance & Transactions (2 tools)
- 📅 Events (2 tools)

Total planned: **42 tools** covering core Stripe operations

---

## 🔗 Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

## 📄 License

MIT License - Free to use and modify

---

## 🤝 Contributing

Contributions welcome! Please ensure:
- TypeScript compiles without errors
- All tests pass
- Code follows ESLint/Prettier standards
- New tools include proper documentation and Zod validation

---

## 🙏 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [Stripe API](https://stripe.com/docs/api)
- Based on [mcp-server-template](https://github.com/dunialabs/mcp-servers/tree/main/mcp-server-template)

---

**Secure payment processing with Stripe and Claude!** 💳✨
