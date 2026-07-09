# Мульти-провайдер поддержка

NoCowboy может использовать любой LLM провайдер через LiteLLM proxy. Это заменяет стандартный Anthropic API на Bedrock, Vertex AI, OpenAI, DeepSeek или 200+ других провайдеров.

## Быстрый старт

### 1. Запуск прокси

```bash
# Установка LiteLLM и запуск прокси
nocowboy-proxy start

# Проверка статуса
nocowboy-proxy status
```

### 2. Настройка провайдеров

```bash
# Интерактивная настройка API-ключей
nocowboy-proxy configure

# Или отредактируй конфиг напрямую
nano ~/.nocowboy/proxy/litellm-config.yaml
```

### 3. Использование в nocowboy.json

Прокси предоставляет модели по имени. Используй имя модели как model в конфигах агентов nocowboy.json.

Поддерживаемые имена моделей из конфига по умолчанию:
- `claude-sonnet-4` — направляется к Anthropic, Bedrock, Vertex или GitHub (в зависимости от конфигурации)
- `deepseek-v4-pro` — через DeepSeek API
- `gpt-4o` — через OpenAI

Пример конфига агента в nocowboy.json:
```json
"architect": {
  "mode": "primary",
  "model": "claude-sonnet-4",
  ...
}
```

### 4. URL прокси

```bash
# Вывести URL прокси для справки
nocowboy-proxy url
# → http://127.0.0.1:8080
```

## Конфигурация провайдеров

Из коробки прокси поддерживает этих провайдеров:

| Провайдер | Config Key | Учётные данные |
|-----------|-----------|----------------|
| Anthropic | `anthropic/claude-*` | `ANTHROPIC_API_KEY` |
| AWS Bedrock | `bedrock/anthropic.*` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| Google Vertex AI | `vertex_ai/claude-*` | `VERTEX_PROJECT`, `VERTEX_LOCATION` |
| GitHub Models | `github/claude-*` | `GITHUB_TOKEN` |
| DeepSeek | `openai/deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `openai/gpt-*` | `OPENAI_API_KEY` |

## Разные модели для разных задач

Используй дешёвые/быстрые модели для простых задач и более сильные — для сложных:

```json
"nocowboy": {
  "model": "deepseek/deepseek-v4-flash",
  ...
},
"architect": {
  "model": "deepseek/deepseek-v4-pro",
  ...
}
```

## Решение проблем

```bash
# Просмотр логов прокси
nocowboy-proxy logs

# Перезапуск с изменениями
nocowboy-proxy stop && nocowboy-proxy start

# Тест прокси напрямую
curl http://127.0.0.1:8080/health
```
