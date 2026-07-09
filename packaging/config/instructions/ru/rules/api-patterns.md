---
paths:
  - "**/*.api.ts"
  - "src/routes/**"
  - "server/routes/**"
  - "api/**"
---

# Правила разработки API

- Все endpoint'ы должны валидировать входные данные через Zod
- Возвращай единый формат ошибок: { error: { code, message } }
- Используй существующий rateLimiter middleware для всех публичных endpoint'ов
- Все POST/PUT/DELETE/PATCH endpoint'ы должны быть CSRF-защищены
- Никогда не показывай stack trace в ответах с ошибками
- Используй правильные HTTP статус-коды (201 для создания, 204 для удаления и т.д.)
- Пагинируй list endpoint'ы с курсорной или offset-пагинацией
- Документируй все endpoint'ы через OpenAPI/Swagger аннотации
