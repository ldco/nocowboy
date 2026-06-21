# @nocowboy/nocowboy-gateway

Unified NoCowboy Gateway package for OpenCode providing authentication, AI provider integration, and API access.

## Features

- **Authentication**: Device authorization flow for NoCowboy Gateway
- **AI Provider**: OpenRouter-based provider with NoCowboy Gateway integration
- **API Integration**: Profile, balance, and model management
- **TUI Helpers**: Utilities for terminal UI components

## Installation

```bash
bun add @nocowboy/nocowboy-gateway
```

## Usage

### Plugin Registration

```typescript
import { NoCowboyAuthPlugin } from "@nocowboy/nocowboy-gateway"

// Register with OpenCode
const plugins = [NoCowboyAuthPlugin]
```

### Provider Usage

```typescript
import { createNoCowboy } from "@nocowboy/nocowboy-gateway"

const provider = createNoCowboy({
  nocowboyToken: process.env.NOCOWBOY_API_KEY,
  nocowboyOrganizationId: "org-123",
})

const model = provider.languageModel("anthropic/claude-sonnet-4")
```

### API Access

```typescript
import { fetchProfile, fetchBalance } from "@nocowboy/nocowboy-gateway"

const profile = await fetchProfile(token)
const balance = await fetchBalance(token)
```

## License

MIT
