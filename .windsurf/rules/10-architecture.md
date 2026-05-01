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
