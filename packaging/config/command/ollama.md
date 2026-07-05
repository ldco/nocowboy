---
description: Set up and use local Ollama models for offline AI
---

# /ollama — Local Ollama Models

Configure offline AI using local Ollama models instead of cloud providers.

## Prerequisites

- Ollama installed: `curl -fsSL https://ollama.com/install.sh | sh`
- At least one model pulled: `ollama pull llama3.2:3b`

## Steps

1. **Check Ollama** — verify it's running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Auto-detect** — Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`
   No auth required. All Ollama models appear as `ollama/<model_name>`.

3. **Configure** — add to `~/.config/nocowboy/nocowboy.json`:
   ```json
   {
     "providers": {
       "ollama": {
         "type": "openai",
         "url": "http://localhost:11434/v1",
         "models": ["llama3.2:3b", "codellama:7b", "qwen2.5-coder:7b"]
       }
     }
   }
   ```

4. **Switch model** — use `/models` in the TUI or `/switch model ollama/llama3.2:3b`

## Recommended Models

| Model | Size | Use case |
|-------|------|----------|
| `llama3.2:3b` | 2GB | Quick tasks, chat |
| `qwen2.5-coder:7b` | 4.5GB | Code generation |
| `codellama:7b` | 3.8GB | Code completion |
| `deepseek-coder:6.7b` | 3.8GB | Technical tasks |
