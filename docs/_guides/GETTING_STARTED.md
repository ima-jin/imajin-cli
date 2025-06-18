# 🚀 Getting Started with imajin-cli

**From Business Context to Professional CLI in 15 Minutes**

## Quick Overview

imajin-cli generates **professional CLI tools you own forever** from OpenAPI/GraphQL specifications. No subscriptions, no vendor lock-in, no ongoing costs.

**What you'll achieve:**
- Transform any API into a business-focused CLI tool
- Generate professional commands with enterprise patterns built-in
- Own your tools forever with no ongoing dependencies

## 🎯 Prerequisites

- **Node.js 20+** - Latest LTS version
- **npm or yarn** - Package manager
- **API Specification** - OpenAPI/GraphQL spec for your service
- **Business Context** - Understanding of your domain workflows

## 📦 Installation

### Option 1: Global Installation (Recommended)
```bash
# Install globally for system-wide access
npm install -g @imajin/cli

# Verify installation
imajin --version
imajin --help
```

### Option 2: Local Project Installation
```bash
# Install in specific project
npm install @imajin/cli --save-dev

# Use with npx
npx imajin --version
```

### Option 3: Development Installation
```bash
# Clone and build from source
git clone https://github.com/imajin/imajin-cli
cd imajin-cli
npm install
npm run build

# Use development version
./bin/imajin --version
```

## 🏃‍♂️ Quick Start (5 Minutes)

### Step 1: Choose Your Service
```bash
# Popular services with built-in contexts
imajin list-services

# Output:
# ✅ stripe - Payment processing (business context: payment-processing)
# ✅ notion - Content management (business context: content-management)  
# ⏳ github - Developer operations (business context: developer-operations)
# ⏳ shopify - E-commerce (business context: e-commerce)
```

### Step 2: Generate Your First CLI
```bash
# Generate Stripe CLI with business context
imajin generate stripe \
  --business-context payment-processing \
  --output-name my-payments-cli \
  --features "enterprise-patterns,webhooks,monitoring"

# Output:
# 🎯 Analyzing Stripe OpenAPI specification...
# 🏢 Applying payment-processing business context...
# 🏗️ Generating TypeScript CLI with enterprise patterns...
# ✅ Generated my-payments-cli successfully!
```

### Step 3: Install and Configure
```bash
# Install generated CLI
cd my-payments-cli
npm install

# Configure credentials
./bin/my-payments-cli credentials:set \
  --api-key "sk_test_your_stripe_key" \
  --environment "development"

# Test connection
./bin/my-payments-cli health:check
```

### Step 4: Use Business Commands
```bash
# Business-focused commands, not generic API calls
./bin/my-payments-cli customer:onboard \
  --name "Acme Corp" \
  --email "billing@acme.com" \
  --plan "professional"

# Check results
./bin/my-payments-cli customer:list --format table
```

## 🏢 Complete Business Context Setup

### Step 1: Understand Business Contexts

**Available Contexts:**
- **payment-processing** - Customer lifecycle, subscriptions, revenue
- **content-management** - Documents, workspaces, publishing workflows
- **developer-operations** - Code management, issues, deployments
- **e-commerce** - Products, orders, inventory, customers
- **crm-management** - Leads, contacts, deals, pipeline

### Step 2: Choose Your Business Domain

```bash
# Explore business context details
imajin context:info payment-processing

# Output:
# 🏢 Payment Processing Context
# 
# Domain: Customer lifecycle and revenue operations
# 
# Entities:
#   • Customer - Onboarding, management, lifecycle
#   • Subscription - Recurring billing, plan management
#   • Payment - Transaction processing, financial operations
#   • Revenue - Analytics, reporting, optimization
# 
# Sample Commands:
#   • customer:onboard - Complete customer onboarding
#   • subscription:upgrade - Upgrade to higher plan
#   • revenue:analyze - Generate revenue insights
#   • dispute:resolve - Handle chargebacks
```

### Step 3: Generate with Full Configuration

```bash
# Generate with comprehensive business context
imajin generate stripe \
  --spec https://api.stripe.com/openapi.json \
  --business-context payment-processing \
  --output-name my-payments-cli \
  --features "enterprise-patterns,monitoring,webhooks,background-jobs" \
  --business-rules "trial-period=14,currency=usd,tax-handling=automatic" \
  --integrations "slack-notifications,email-reports"
```

### Step 4: Initialize Business Configuration

```bash
cd my-payments-cli

# Initialize business context
./bin/my-payments-cli context:init \
  --business-type "saas" \
  --industry "software" \
  --company-size "startup" \
  --primary-currency "usd" \
  --time-zone "America/New_York"

# Configure business rules
./bin/my-payments-cli context:rules \
  --default-trial-period 14 \
  --payment-terms "net-30" \
  --refund-policy "30-days" \
  --dunning-enabled true \
  --proration-enabled true

# Set up integrations
./bin/my-payments-cli integrations:setup \
  --slack-webhook "https://hooks.slack.com/..." \
  --email-notifications "finance@company.com" \
  --dashboard-url "https://dashboard.company.com"
```

## 💼 Real-World Examples

### SaaS Payment Processing Workflow

```bash
# 1. Customer onboarding with trial
my-payments-cli customer:onboard \
  --company "TechStart Inc" \
  --email "billing@techstart.com" \
  --plan "professional" \
  --trial-days 14 \
  --setup-billing-portal \
  --welcome-email \
  --assign-success-manager "sarah@company.com"

# 2. Monitor trial progress
my-payments-cli customer:trial-status \
  --customer cus_techstart123 \
  --include-usage-metrics \
  --alert-on-risk

# 3. Convert trial to paid subscription
my-payments-cli subscription:convert-trial \
  --customer cus_techstart123 \
  --confirm-plan "professional-annual" \
  --apply-discount "early-bird-20" \
  --send-confirmation

# 4. Generate revenue report
my-payments-cli revenue:report \
  --period "last-month" \
  --breakdown-by "plan,industry" \
  --include-metrics "mrr,churn,ltv" \
  --export "csv" \
  --email-to "finance@company.com"
```

### Content Team Editorial Workflow

```bash
# Generate content management CLI
imajin generate notion \
  --business-context content-management \
  --output-name my-content-cli

cd my-content-cli
npm install

# 1. Create editorial content
./bin/my-content-cli document:create \
  --type "blog-post" \
  --title "Product Launch: Revolutionary CLI Tool" \
  --template "product-announcement" \
  --assign-writer "alex@company.com" \
  --deadline "2025-07-15" \
  --approval-workflow "editor-review"

# 2. Track editorial progress
./bin/my-content-cli editorial:status \
  --content-calendar "Q3-2025" \
  --filter-by "in-progress" \
  --notify-delays

# 3. Publish with cross-channel coordination
./bin/my-content-cli content:publish \
  --document doc_product_launch \
  --channels "blog,social-media,newsletter" \
  --schedule "2025-07-15T09:00:00Z" \
  --seo-optimize \
  --track-performance
```

### Developer Operations Pipeline

```bash
# Generate GitHub CLI for dev operations
imajin generate github \
  --business-context developer-operations \
  --output-name my-dev-cli

# 1. Triage and assign critical issue
./bin/my-dev-cli issue:triage \
  --issue-number 456 \
  --severity "critical" \
  --assign-to "on-call-team" \
  --escalate-to "engineering-manager" \
  --notify-stakeholders

# 2. Coordinate code review
./bin/my-dev-cli code:review \
  --pull-request 123 \
  --reviewers "senior-devs" \
  --checks "security,performance,style" \
  --deadline "2-days"

# 3. Deploy with rollback protection
./bin/my-dev-cli release:deploy \
  --version "v2.1.0" \
  --environment "production" \
  --strategy "canary" \
  --rollback-on-error \
  --notify-teams "engineering,product,support"
```

## 🔧 Advanced Configuration

### Enterprise Features Setup

```bash
# Enable comprehensive monitoring
my-payments-cli monitoring:setup \
  --health-checks "api,database,payments" \
  --metrics "response-time,error-rate,throughput" \
  --alerts "slack,email,pagerduty" \
  --dashboard-integration

# Configure advanced logging
my-payments-cli logging:configure \
  --level "info" \
  --structured-format "json" \
  --destinations "file,console,remote" \
  --retention-days 90 \
  --compliance "gdpr,pci"

# Set up webhook handling
my-payments-cli webhooks:configure \
  --endpoint "https://app.company.com/webhooks/stripe" \
  --events "customer.created,subscription.updated,payment.failed" \
  --secret-key "whsec_..." \
  --retry-strategy "exponential-backoff"
```

### Multi-Service Integration

```bash
# Generate multiple service CLIs
imajin generate stripe --business-context payment-processing --output my-payments-cli
imajin generate notion --business-context content-management --output my-content-cli
imajin generate github --business-context developer-operations --output my-dev-cli

# Create unified workflow scripts
cat > workflows/customer-onboarding.sh << 'EOF'
#!/bin/bash
# Complete customer onboarding workflow

# 1. Create customer in payments system
CUSTOMER_ID=$(my-payments-cli customer:create \
  --name "$1" \
  --email "$2" \
  --plan "$3" \
  --json | jq -r '.data.id')

# 2. Create customer workspace in content system
WORKSPACE_ID=$(my-content-cli workspace:create \
  --name "$1 Workspace" \
  --customer-id "$CUSTOMER_ID" \
  --template "customer-onboarding" \
  --json | jq -r '.data.id')

# 3. Create tracking issue in dev system
ISSUE_ID=$(my-dev-cli issue:create \
  --title "New Customer: $1" \
  --labels "customer-success,onboarding" \
  --assign-to "customer-success-team" \
  --json | jq -r '.data.number')

echo "Customer onboarding complete:"
echo "  Payment ID: $CUSTOMER_ID"
echo "  Workspace ID: $WORKSPACE_ID"
echo "  Tracking Issue: $ISSUE_ID"
EOF

chmod +x workflows/customer-onboarding.sh
```

## 🤖 AI Integration

### LLM-Ready JSON Output

```bash
# All commands support --json for AI parsing
my-payments-cli customer:list --json | jq '.'

# Output:
{
  "success": true,
  "data": {
    "customers": [...],
    "pagination": {...}
  },
  "metadata": {
    "duration": 245,
    "timestamp": "2025-06-17T12:00:00Z",
    "command": "customer:list",
    "rateLimitStatus": {
      "remaining": 99,
      "resetTime": "2025-06-17T12:01:00Z"
    }
  }
}
```

### AI Agent Integration

```bash
# AI agents can discover capabilities
my-payments-cli introspect:commands --format json
my-payments-cli introspect:schemas --format json

# AI agents can execute commands directly
ai-agent execute my-payments-cli customer:create \
  --name "{{customer.name}}" \
  --email "{{customer.email}}" \
  --plan "{{customer.preferred_plan}}" \
  --json
```

## 🎯 Success Checklist

### ✅ Installation Success
- [ ] imajin-cli installed and accessible
- [ ] Generated CLI runs without errors
- [ ] Credentials configured properly
- [ ] Health check passes

### ✅ Business Context Integration
- [ ] Business commands work (not generic API calls)
- [ ] Domain terminology matches your workflows
- [ ] Enterprise patterns active (rate limiting, logging, monitoring)
- [ ] Business rules configured correctly

### ✅ Production Readiness
- [ ] Error handling works properly
- [ ] Monitoring and alerting configured
- [ ] Webhook handling set up (if needed)
- [ ] Team integrations working (Slack, email, etc.)

### ✅ AI Integration
- [ ] JSON output parsing works
- [ ] Introspection APIs available
- [ ] AI agents can execute commands
- [ ] Real-time progress tracking active

## 🆘 Troubleshooting

### Common Issues

**Installation Problems:**
```bash
# Clear npm cache
npm cache clean --force

# Install with specific Node version
nvm use 20
npm install -g @imajin/cli

# Permission issues (macOS/Linux)
sudo npm install -g @imajin/cli
```

**Generation Failures:**
```bash
# Verify API specification
imajin validate-spec https://api.stripe.com/openapi.json

# Check business context
imajin context:info payment-processing

# Generate with verbose logging
imajin generate stripe --verbose --debug
```

**CLI Runtime Issues:**
```bash
# Test basic functionality
./bin/my-cli health:check

# Check credentials
./bin/my-cli credentials:test

# Verify API connectivity
./bin/my-cli diagnostics:network
```

### Getting Help

- **Documentation**: [docs/](../docs/)
- **Examples**: [examples/](../examples/)
- **Issues**: [GitHub Issues](https://github.com/imajin/imajin-cli/issues)
- **Community**: [Discord](https://discord.gg/imajin-cli)

---

**🎉 Congratulations! You now have professional CLI tools that you own forever, with no subscriptions or vendor lock-in. Welcome to the democratic revolution in API integration!** 