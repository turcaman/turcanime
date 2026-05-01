---
trigger: always_on
description: Project-specific architecture and constraints
---

# ARCHITECTURE

- Respect layer boundaries:

  - domain: pure logic only
  - infrastructure: external IO only
  - application: coordination only
  - presentation: UI only

- Do not mix responsibilities across layers.
- Do not place business logic in presentation.

---

# DEPENDENCIES

- Use dependency injection for services.
- Do not instantiate dependencies inside business logic.
- Do not bypass defined abstractions.

---

# PROVIDERS

- Providers must follow a common interface.
- Keep provider-specific logic isolated.
- Do not hardcode provider behavior.

---

# STRUCTURE

- Each file must have a single purpose.
- Split files when they become hard to read.

- Limits:
  - functions: ~50 lines
  - files: ~500 lines

---

# CODE RULES

- Prefer clear code over clever code.
- Avoid unnecessary abstractions.
- Do not introduce patterns without need.

- Avoid duplication.
- Extract shared logic when repeated.

---

# ERROR HANDLING

- Do not ignore errors.
- Use explicit error handling.
- Fail early when possible.

---

# UI RULES

- UI must not contain business logic.
- Keep rendering separate from logic.

---

# REFACTORING

- Do not refactor unrelated code.
- Keep changes minimal and scoped.