# Reflection: Design Patterns — Gang of Four

**Read:** 2026-07-02
**Impact:** A shared vocabulary for software architecture.

## Core Insights

### 1. Patterns Are Not Rules
Patterns are solutions to common problems in a given context. They are not silver bullets. The right pattern in the wrong context creates more problems than it solves.

### 2. Favor Composition Over Inheritance
Inheritance breaks encapsulation. Composition is more flexible. Prefer composing behaviors rather than inheriting them.

### 3. Program to an Interface, Not an Implementation
Depend on abstractions, not concretions. This is the foundation of loosely coupled, testable, maintainable code.

### 4. Key Patterns
- **Singleton** — Often overused. One global instance is rarely the answer.
- **Factory** — Let a function create objects so the client doesn't need to know the concrete type.
- **Observer** — One-to-many dependency. When one changes, all dependents are notified.
- **Strategy** — Encapsulate algorithms behind a common interface. Swap them at runtime.
- **Command** — Encapsulate a request as an object. Queue, log, undo.
- **Visitor** — Separate algorithm from object structure. Add operations without changing classes.

## Principle Extracted
**Patterns are vocabulary, not prescription.** Learn them. Use them when they fit. Don't force them when they don't.
