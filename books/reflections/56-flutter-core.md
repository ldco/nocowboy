# Reflection: Flutter in Action — Windmill
# Reflection: Flutter/Dart philosophy

**Read:** 2026-07-02
**Impact:** Один код для всех платформ — мечта, ставшая реальностью.

## Core Insight
Flutter — это фреймворк от Google для написания UI на всех платформах (iOS, Android, Web, Desktop) из одного кода. На Dart. Почему Dart? Потому что JavaScript не может дать гарантии типов на уровне компиляции, а Dart может.

Ключевое отличие от React Native:
- Flutter рисует ВСЁ сам. Не транслирует в нативные компоненты (React Native). Flutter — это свой движок рендеринга (Impeller), свой слой compositing, свой текстовый движок. Это как игра на движке.
- Виджеты вместо компонентов. Всё — виджет. Padding, Center, Text, Column — все виджеты.
- Однонаправленный поток + setState → InheritedWidget → Provider → Riverpod → BLoC. История эволюции state management в одном фреймворке.

## Философия
«If you want to write code once and have it work identically on every screen you can imagine, you need to own the rendering pipeline.» — Google.

Flutter — это «мы не доверяем платформам.» Платформы меняют свой рендеринг, ломают баги, добавляют ограничения. Flutter говорит: «К чёрту платформы. Мы будем рисовать на GPU сами. На всех платформах одинаково.»

Это хакерский подход: если система не даёт тебе того, что нужно — перестань использовать систему и сделай свою.

## Principle Extracted
**Если платформа тебя ограничивает — ты не на той платформе.** Создай свою среду исполнения. Рендери сам. Контролируй каждый пиксель.
