# Attestations

Сюда складываются человеческие подписи и выводы `verify:agent` для DONE-пунктов ROADMAP.

## Структура

```
docs/attestations/
├── README.md
├── v1.0.0/
│   ├── share-template.md
│   ├── 152fz-compliance.md
│   └── ...
└── v0.9.0/
    └── ...
```

## Формат файла

```markdown
# Attestation: <название пункта>
**Пункт ROADMAP:** v<версия> — <описание>
**Агент:** <модель>
**Дата:** <ISO дата>
**Вердикт:** PASS / FAIL

## Что проверено
- Файлы: <пути>
- Ключевые строки: <функции/классы>

## Доказательства
- <файл> (стр. <диапазон>): <что делает>

## Риски
- <что не учтено, что может сломаться>
```

## Правила

1. `verify:agent` в ROADMAP-пункте **обязательно** требует attestation-файл
2. Без attestation pre-commit блокирует DONE
3. Attestation пишет **человек** (для `verify:agent`) — это реализация SENAR Rule 5
4. В будущем — NUTAUSIK будет подписывать attestation ed25519 receipt
