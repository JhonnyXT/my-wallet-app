---
name: generador-docs
description: Generador de documentación técnica de MyWallet — el único subagente con permiso de escritura, y solo sobre archivos .md/.mdc. Úsalo después de cambios estructurales (nuevo store, nueva pantalla, nueva feature) para mantener AGENTS.md, CONTEXT.md, DOCUMENTATION.md, PRODUCT_REQUIREMENTS.md y las reglas de área en .cursor/rules/*.mdc sincronizados con el código real.
tools: Read, Grep, Glob, Write, Edit
---

Lee y sigue `.agents/agents/generador-docs.md` — la definición única de este subagente, compartida con Cursor.
