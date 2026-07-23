# /push — Sincronizar docs y subir a origin

El código en `origin` es, en la práctica, la versión "definitiva" del proyecto —
por eso este comando existe separado de `/commit`: es la última oportunidad de
asegurarse de que `AGENTS.md`, `CONTEXT.md`, `DOCUMENTATION.md` y
`PRODUCT_REQUIREMENTS.md` describen lo que el código realmente hace, antes de
que esos commits salgan del repo local.

`/commit` ya revisa documentación por cada commit individual (Paso 3), pero es
fácil que un cambio puntual documente `AGENTS.md` (gotcha técnico) y se olvide
de `DOCUMENTATION.md` (comportamiento visible al usuario) o
`PRODUCT_REQUIREMENTS.md` (si el cambio agrega/modifica una funcionalidad).
Este comando revisa los 4 documentos juntos, en el conjunto completo de
commits que se van a subir, no archivo por archivo.

## Instrucciones

### Paso 1 — Identificar qué se va a subir

```bash
git status --porcelain
git log origin/<rama-actual>..HEAD --oneline
```

Si hay cambios sin commitear, ofrecer correr `/commit` primero — este comando
asume que ya no hay working tree sucio, solo commits locales por subir.

Si no hay commits por subir (`git log origin/<rama>..HEAD` vacío), informar al
usuario y terminar aquí, no hay nada que hacer.

### Paso 2 — Revisar el diff completo contra la documentación

```bash
git diff origin/<rama-actual>..HEAD --stat
```

Invocar el subagente `generador-docs` con el rango completo de commits a
subir (no un commit a la vez) para que audite los 4 documentos contra el
código real:
- `AGENTS.md` — stores, rutas, gotchas, deuda técnica, stack
- `CONTEXT.md` — arquitectura, interfaces, flujos técnicos
- `DOCUMENTATION.md` — comportamiento visible al usuario final (si el cambio
  toca UI, permisos, mensajes o flujos que el usuario ve)
- `PRODUCT_REQUIREMENTS.md` — si el cambio agrega, modifica o completa una
  historia de usuario

### Paso 3 — Mostrar y confirmar los cambios de documentación

Si `generador-docs` propone cambios, mostrar el diff al usuario **antes** de
commitearlos. Si el usuario los aprueba, commitear aparte con
`docs: sincronizar documentación con <resumen de los commits que se suben>`.

Si no hace falta ningún cambio de documentación, decirlo explícitamente
("documentación al día, nada que sincronizar") y continuar.

### Paso 4 — Push

Solo después de resolver el paso 3:

```bash
git push origin <rama-actual>
```

### Paso 5 — Confirmar

```bash
git log origin/<rama-actual>..HEAD --oneline
```

Debe quedar vacío. Reportar al usuario el rango de commits subido.

## Cuándo NO usar este comando

- Si solo quieres commitear sin subir → usa `/commit`.
- Si ya sabes que la documentación está al día (acabas de correr `/push`
  hace un momento sin tocar código nuevo) → puedes pedir un push directo, pero
  este comando sigue siendo la vía por defecto recomendada.
