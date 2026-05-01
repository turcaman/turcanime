---
trigger: always_on
description: Core behavior constraints for all code generation
---

# GLOBAL CONSTRAINTS

- Code must be self-explanatory.
- Do not add information that is already obvious.
- Avoid redundant comments and explanations.

- Prefer simple and direct solutions.
- Each unit of code must have a single purpose.

- Do not duplicate logic.
- Reuse existing code before creating new code.

- Make inputs, outputs, and dependencies explicit.
- Avoid hidden state and implicit behavior.

- Before modifying code:
  - understand current behavior
  - check for existing implementations

- Apply changes in small, controlled steps.
- Do not modify code outside the requested scope.

- When modifying code:
  → leave it clearer than before

- If a comment does not add new information:
  → do not write it
