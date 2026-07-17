// Secret scan — проверка содержимого на наличие API keys, токенов, паролей.
// Используется в write/edit/apply_patch как PostToolUse проверка.
// Набор паттернов из gitleaks + common sense.

const SECRET_PATTERNS: Array<{ pattern: RegExp; severity: "high" | "medium" | "low"; type: string }> = [
  // ── High severity ──────────────────────────────────────────────────
  { pattern: /(?:sk|pk)_[a-fA-F0-9]{32,}/, severity: "high", type: "OpenAI API Key" },
  { pattern: /AIza[0-9A-Za-z_-]{35}/, severity: "high", type: "Google API Key" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, severity: "high", type: "GitHub PAT" },
  { pattern: /gho_[a-zA-Z0-9]{36}/, severity: "high", type: "GitHub OAuth" },
  { pattern: /github_pat_[a-zA-Z0-9]{22,}/, severity: "high", type: "GitHub Fine-Grained PAT" },
  { pattern: /AKIA[0-9A-Z]{16}/, severity: "high", type: "AWS Access Key" },
  { pattern: /token.*=.*['\"][a-zA-Z0-9_-]{20,}['\"]/i, severity: "high", type: "Generic Token" },
  { pattern: /api[_-]?key.*=.*['\"][a-zA-Z0-9_-]{16,}['\"]/i, severity: "high", type: "API Key" },
  { pattern: /secret.*=.*['\"][a-zA-Z0-9_-]{16,}['\"]/i, severity: "high", type: "Secret" },
  { pattern: /password.*=.*['\"][^'\"\s]{8,}['\"]/i, severity: "high", type: "Password" },

  // ── Medium severity ────────────────────────────────────────────────
  { pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, severity: "medium", type: "Private Key" },
  { pattern: /jwt[-_]?secret.*=.*['\"][a-zA-Z0-9_-]{16,}['\"]/i, severity: "medium", type: "JWT Secret" },
  { pattern: /slack.*token.*=.*['\"][a-zA-Z0-9_-]{20,}['\"]/i, severity: "medium", type: "Slack Token" },
  { pattern: /discord.*token.*=.*['\"][a-zA-Z0-9_-]{20,}['\"]/i, severity: "medium", type: "Discord Token" },

  // ── Low severity ────────────────────────────────────────────────────
  { pattern: /(?:db|database)_(?:url|uri|name).*=.*['\"].+['\"]/i, severity: "low", type: "Database Connection String" },
  { pattern: /connection.?string.*=.*['\"].+['\"]/i, severity: "low", type: "Connection String" },
]

export interface SecretMatch {
  line: number
  type: string
  severity: "high" | "medium" | "low"
  snippet: string
}

/**
 * Scan file content for hardcoded secrets.
 * Returns array of matches, ordered by severity (high first).
 */
export function scanSecrets(content: string): SecretMatch[] {
  const results: SecretMatch[] = []
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("*")) continue

    for (const { pattern, severity, type } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        results.push({
          line: i + 1,
          type,
          severity,
          snippet: line.trim().slice(0, 80),
        })
        // Don't report multiple matches on same line
        break
      }
    }
  }

  // Sort by severity (high first)
  const order = { high: 0, medium: 1, low: 2 }
  results.sort((a, b) => order[a.severity] - order[b.severity])

  return results
}

/**
 * Format secret scan results as a warning string.
 */
export function formatSecretWarning(matches: SecretMatch[]): string {
  if (matches.length === 0) return ""

  const high = matches.filter((m) => m.severity === "high")
  const medium = matches.filter((m) => m.severity === "medium")

  const parts: string[] = []
  parts.push("⚠️  Secret scan detected potential secrets in file:")

  for (const m of matches.slice(0, 10)) {
    parts.push(`  [${m.severity.toUpperCase()}] Line ${m.line}: ${m.type} — ${m.snippet}`)
  }
  if (matches.length > 10) {
    parts.push(`  ... and ${matches.length - 10} more`)
  }

  if (high.length > 0) {
    parts.push("")
    parts.push("⛔ ACTION REQUIRED: Remove hardcoded secrets before committing.")
    parts.push("   Use environment variables or a secrets manager (e.g. .env, Doppler, Vault).")
  }

  return parts.join("\n")
}
