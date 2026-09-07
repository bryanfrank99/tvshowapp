# Flujo SDD (Spec-Driven Development)

```
idea → specs/NNN-nombre/spec.md → plan.md → tasks.md → implementar → verificar
```

1. **Spec**: QUÉ y POR QUÉ (criterios de aceptación verificables). Nada de código.
2. **Plan**: CÓMO (archivos a tocar, decisiones, riesgos). Se aprueba antes de codificar.
3. **Tasks**: lista ejecutable con Todos (cada item: archivo + verificación).
4. **Implementar**: una task a la vez, marcando progreso.
5. **Verificar**: `npm run build` + prueba real (curl o navegador) + commit solo si se pide.

## Reglas

- Una spec = una feature. Numeración `NNN` incremental (`ls specs` para la siguiente).
- Copiar plantillas desde `specs/templates/`.
- Si una task revela que la spec estaba mal, se corrige la spec primero.
- La constitución manda sobre cualquier spec.
