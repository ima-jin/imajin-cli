# Development Testing Workflow

This document describes the recommended workflow for developing and testing the Imajin CLI against both local and remote services.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or pnpm package manager
- Git for cloning repositories
- Access to the imajin-cli repository

### Initial Setup (One-Time)

1. **Clone the Imajin CLI repository:**
   ```bash
   cd D:\Projects
   # If not already cloned
   git clone https://github.com/ima-jin/imajin-cli.git
   cd imajin-cli
   ```

2. **Install dependencies and build:**
   ```bash
   npm install
   npm run build
   ```

3. **Link for global development access:**
   ```bash
   npm link
   ```
   
   ✅ Now you can use `imajin` command globally with your local development code!

## 🔄 Development Workflow Options

### Option 1: npm link (Recommended)
**Best for active development - changes reflect immediately**

```bash
# Make changes to imajin-cli source code
# Test immediately from any directory
cd D:\Projects\WeR1\wer1-graph
imajin generate local-test --spec http://localhost:4000/graphql
```

### Option 2: Direct Execution
**Best for debugging and quick tests**

```bash
# Run directly from imajin-cli project
cd D:\Projects\imajin\imajin-cli
node dist/bin/imajin.js generate --help

# With debugging
node --inspect dist/bin/imajin.js generate wer1-graph --spec ./test-schema.graphql
```

### Option 3: npx (No Installation)
**Best for one-off testing**

```bash
npx @imajin/cli generate stripe --spec https://api.stripe.com/openapi.json
```

## 🧪 Testing Scenarios

### Testing Against Local Services

#### Example: wer1-graph Project
```bash
# Terminal 1: Start local GraphQL service
cd D:\Projects\WeR1\wer1-graph
npm run dev  # Usually runs on http://localhost:4000

# Terminal 2: Generate CLI for local service
cd D:\Projects\imajin\imajin-cli
imajin generate wer1-graph \
  --spec http://localhost:4000/graphql \
  --business-context "music-streaming" \
  --output-name "my-wer1-cli"

# Terminal 3: Test the generated CLI
./my-wer1-cli --help
./my-wer1-cli query:users --format json
```

#### Example: Local REST API
```bash
# If you have OpenAPI spec file locally
imajin generate local-api \
  --spec ./path/to/openapi.json \
  --business-context "internal-tools" \
  --output-name "my-internal-cli"
```

### Testing Against Remote APIs

#### Example: Stripe Integration
```bash
imajin generate stripe \
  --spec https://api.stripe.com/openapi.json \
  --business-context "payment-processing" \
  --output-name "my-payments-cli"

# Test the generated CLI
./my-payments-cli customer:create --help
```

#### Example: GitHub API
```bash
imajin generate github \
  --spec https://api.github.com/openapi.json \
  --business-context "repository-management" \
  --output-name "my-github-cli"
```

## 🛠️ Development Best Practices

### Continuous Development Setup

1. **Use watch mode for auto-rebuild:**
   ```bash
   # Terminal 1: Auto-rebuild on changes
   cd D:\Projects\imajin\imajin-cli
   npm run build:watch  # or tsc --watch
   
   # Terminal 2: Test your changes
   imajin generate test --spec ./test-spec.json
   ```

2. **Hot reload workflow:**
   ```bash
   # Make changes to src/ files
   # → Auto-rebuild happens
   # → Test immediately with linked global command
   imajin --version  # Should show your changes
   ```

### Debugging Workflow

1. **Enable debug logging:**
   ```bash
   DEBUG=imajin:* imajin generate test --spec ./spec.json
   ```

2. **Use Node.js debugger:**
   ```bash
   node --inspect-brk dist/bin/imajin.js generate test --spec ./spec.json
   # Then connect with Chrome DevTools or VS Code
   ```

3. **Check generated output:**
   ```bash
   # Generated CLIs are typically output to current directory
   ls -la ./my-*-cli
   cat ./my-test-cli  # Check the generated CLI script
   ```

### Testing Checklist

- [ ] **Local service integration** - Test with running local APIs
- [ ] **Remote API integration** - Test with public APIs
- [ ] **Generated CLI functionality** - Verify generated commands work
- [ ] **Business context accuracy** - Check domain-specific commands
- [ ] **Error handling** - Test with invalid specs/endpoints
- [ ] **Cross-platform compatibility** - Test on Windows/Mac/Linux

## 🔧 Troubleshooting

### Common Issues

1. **"imajin command not found" after npm link:**
   ```bash
   # Re-link if needed
   npm unlink -g
   npm link
   ```

2. **Changes not reflecting:**
   ```bash
   # Rebuild and test
   npm run build
   imajin --version
   ```

3. **Local service not accessible:**
   ```bash
   # Check if service is running
   curl http://localhost:4000/graphql
   # or
   curl http://localhost:3000/api/health
   ```

4. **Generated CLI not working:**
   ```bash
   # Check CLI permissions
   chmod +x ./my-generated-cli
   
   # Check CLI help
   ./my-generated-cli --help
   ```

### Logs and Debugging

- **Imajin CLI logs:** `D:\Projects\imajin\imajin-cli\logs`
- **Generated CLI logs:** Usually in the same directory as the CLI
- **Debug output:** Use `DEBUG=*` environment variable

## 📋 Team Workflow

### For New Team Members

1. **Setup (once):**
   ```bash
   git clone https://github.com/ima-jin/imajin-cli.git
   cd imajin-cli
   npm install
   npm run build
   npm link
   ```

2. **Daily development:**
   ```bash
   # Start watch mode
   npm run build:watch
   
   # Test changes immediately
   imajin generate <your-service> --spec <spec-url>
   ```

### For Testing New Features

1. **Create test cases:**
   ```bash
   # Test against known-good APIs
   imajin generate stripe --spec https://api.stripe.com/openapi.json
   
   # Test against your local services
   imajin generate local --spec http://localhost:4000/graphql
   ```

2. **Verify generated output:**
   ```bash
   # Check generated CLI works
   ./my-test-cli --help
   ./my-test-cli <command> --dry-run
   ```

### For Integration Testing

1. **Multi-service testing:**
   ```bash
   # Generate CLIs for multiple services
   imajin generate stripe --spec https://api.stripe.com/openapi.json
   imajin generate github --spec https://api.github.com/openapi.json
   imajin generate local --spec http://localhost:4000/graphql
   
   # Test cross-service workflows
   ./my-stripe-cli customer:create --name "Test User"
   ./my-github-cli issue:create --title "Payment Issue"
   ./my-local-cli user:lookup --email "test@example.com"
   ```

## 🎯 Success Metrics

- ✅ Can generate CLI from local GraphQL service in < 2 minutes
- ✅ Can generate CLI from remote OpenAPI spec in < 1 minute
- ✅ Generated CLI commands work as expected
- ✅ Business context produces domain-specific commands
- ✅ Error handling works gracefully
- ✅ Changes to source code reflect immediately in tests

## 💡 Pro Tips

- Keep multiple terminal windows open (watch mode, local services, testing)
- Use `--dry-run` flags when testing generated CLIs
- Always test both happy path and error scenarios
- Document any new testing patterns you discover
- Use `git stash` to quickly test different branches
- Set up aliases for common testing commands

---

**Happy developing! 🚀**
