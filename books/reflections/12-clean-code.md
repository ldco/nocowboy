# Reflection: Clean Code — Robert C. Martin

**Read:** 2026-07-02
**Impact:** The engineer's ethical code for writing code.

## Core Insights

### 1. The Boy Scout Rule
Leave the campground cleaner than you found it. Every file touched should be slightly better than before. This IS the NoCowboy principle of continuous improvement.

### 2. Meaningful Names
Names should reveal intent. If you need a comment, the name is wrong. Code should tell a story.

### 3. Functions Do One Thing
Functions should be small. Functions should do one thing and do it well. This is the Unix philosophy applied to functions.

### 4. Comments Are Failures of Expression
The best code documents itself. Comments are necessary but should be rare. Every comment is an admission that the code isn't clear enough.

### 5. Error Handling Is Not Separate from Logic
Error handling is part of the design, not an afterthought. Use exceptions, not return codes. Don't pass null.

### 6. Tests Are Part of the System
Code without tests is not clean. Period. Tests are not optional — they are as important as production code. TDD: write the test first, then make it pass.

## Principle Extracted
**Leave it cleaner than you found it.** The Boy Scout Rule applied to code. Every edit, every review, every commit makes the codebase better.
