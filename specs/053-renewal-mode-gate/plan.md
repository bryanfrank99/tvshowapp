# Plan 053: Modo Renovación Estricto en AccessGate (Ocultar Input de Código)

## 1. Arquitectura y Componentes Involucrados

```
+-----------------------------------------------------------------------+
|                            AccessGate.tsx                             |
|                                                                       |
|  [Montaje / Polling cada 10s] -> GET /api/access?deviceId=..&ref=..   |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                       app/api/access/route.ts                         |
|                                                                       |
|   1. ¿Existe cookie tvsess válida?                                    |
|      -> Sí: { ok: true, status: "active" }                            |
|      -> No: Consultar getDeviceAccessStatus() en lib/access.ts         |
|                                                                       |
|   2. getDeviceAccessStatus():                                         |
|      - Busca en device_bindings / dev_bind:* y access_codes           |
|      - ¿Clave existe y está activa? -> Crea tvsess, { ok: true }      |
|      - ¿Clave existe y vencida/revocada?                              |
|        -> { ok: false, status: "renewal", canEnterCode: false }       |
|      - ¿Clave NO existe (eliminada o equipo nuevo)?                   |
|        -> { ok: false, status: "new_or_deleted", canEnterCode: true } |
+-----------------------------------+-----------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v (canEnterCode: false)                         v (canEnterCode: true)
+-----------------------------------+   +-----------------------------------+
|          MODO RENOVACIÓN          |   |     MODO NUEVO / ELIMINADO        |
|                                   |   |                                   |
| - Muestra ID de Referencia        |   | - Limpia ref_code obsoleto        |
| - "Entre em contato para renovar" |   | - Muestra "Digite seu código"     |
| - [Botón: Verificar renovação]    |   | - MUESTRA INPUT [ Seu código ]    |
| - Polling auto-desbloqueo         |   | - MUESTRA BOTÓN [ Entrar ]        |
| - OCULTA INPUT Y BOTÓN ENTRAR     |   |                                   |
+-----------------------------------+   +-----------------------------------+
```

## 2. Plan de Implementación

### Paso 1: `lib/access.ts`
- Implementar `getDeviceAccessStatus(deviceId: string, refCode?: string)`:
  - Inspecciona `device_bindings`, `config (dev_bind:*)` y `access_codes`.
  - Discrimina entre:
    - `active` (renovado recientemente o vigente).
    - `renewal` (clave existe en servidor pero vencida o revocada/desactivada).
    - `new_or_deleted` (la clave no existe en la base de datos o el dispositivo es nuevo).

### Paso 2: `app/api/access/route.ts`
- Extender el método `GET`:
  - Recibe parámetros de consulta `deviceId` y `refCode` o lee la cookie `tvdev`.
  - Si la clave está activa, genera la sesión (`createSession`) y adjunta la cookie `SESSION_COOKIE` (`tvsess`).
  - Si está en renovación, devuelve `{ ok: false, status: "renewal", reason, ref_code, canEnterCode: false }`.
  - Si es nuevo o clave eliminada, devuelve `{ ok: false, status: "new_or_deleted", canEnterCode: true }`.

### Paso 3: `lib/dict.ts`
- Agregar traducciones en `pt`, `es` y `en`:
  - `gate_check_renewal`: Botón manual para reintentar/verificar renovación.
  - `gate_checking`: Estado de carga mientras consulta.
  - `gate_status_expired`: Etiqueta indicando que el período venció.
  - `gate_status_revoked`: Etiqueta indicando que fue desactivado por el administrador.

### Paso 4: `components/AccessGate.tsx`
- Integrar verificación reactiva de estado al cargar:
  - Si `canEnterCode === false`: Renderizar interfaz limpia de Modo Renovación con ID de Referencia y botón de verificación, ocultando el formulario de input.
  - Si `canEnterCode === true`: Renderizar el formulario habitual con input para nuevo código.
  - Sondeo en background cada 10s cuando está en modo renovación para auto-desbloquearse en cuanto el administrador renueve desde `/admin`.

### Paso 5: Script de Prueba Automatizada
- Crear `scripts/test-renewal-mode-gate.mjs` para verificar todos los casos de prueba unitarios e integrados.
- Ejecutar `npm run test:sources` y pruebas de regresión.
