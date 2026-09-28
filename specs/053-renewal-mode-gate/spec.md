# Spec 053: Modo Renovación Estricto en AccessGate (Ocultar Input de Código)

## 1. Contexto y Problema
En TVShow, cada cliente en Smart TV, Android TV, PC o móvil dispone de un identificador de dispositivo (`deviceId`) y, una vez activado, un código de referencia (`ref_code`, ej. `TV-490FA7-423F`) vinculado a su clave de acceso.

Cuando una clave caduca por tiempo (`expires_at <= now()`) o es desactivada por el administrador (`revoked: true` o `suspended_by_billing: true`), el dispositivo entra en **Modo Renovación**. Sin embargo, la pantalla de acceso (`AccessGate.tsx`) mostraba simultáneamente el ID de referencia y el campo de entrada `[ Seu código ] [ Entrar ]`.

Esto causaba confusión:
1. El usuario cree que debe conseguir o ingresar una clave nueva, lo que causa errores de bloqueo anti-churn (`device_blocked_inactive`) al intentar meter claves demo.
2. El administrador renueva la suscripción desde el panel extendiendo la clave existente (`+30d`), por lo que el usuario no necesita ingresar nada nuevo.
3. El campo para ingresar una clave nueva únicamente debe aparecer cuando:
   - El dispositivo es nuevo (nunca ha sido activado).
   - O la clave previa de ese dispositivo fue **eliminada** del servidor (`access_codes` borrada por el admin).

## 2. Requerimientos Funcionales

### A. Detección del Estado en Servidor (`GET /api/access`)
El endpoint `GET /api/access` debe aceptar parámetros de consulta opcionales (`deviceId`, `refCode`) o leer la cookie persistente `tvdev`:
1. **Si existe sesión activa válida**: Retorna `{ ok: true, status: "active" }`.
2. **Si no hay sesión activa**:
   - Consulta si el dispositivo (`deviceId`) o la referencia (`refCode`) existen en el servidor (`device_bindings`, `config` o `access_codes`).
   - **Caso 1: Clave encontrada en servidor**:
     - Si está **activa** (`!revoked && expires_at > now`): Genera sesión (`tvsess`), retorna `{ ok: true, status: "active", ref_code }`.
     - Si está **expirada** (`expires_at <= now`): Retorna `{ ok: false, status: "renewal", reason: "expired", ref_code, canEnterCode: false }`.
     - Si está **desactivada** (`revoked || suspended_by_billing`): Retorna `{ ok: false, status: "renewal", reason: "revoked", ref_code, canEnterCode: false }`.
   - **Caso 2: Clave NO encontrada en servidor (Eliminada o Dispositivo Nuevo)**:
     - Retorna `{ ok: false, status: "new_or_deleted", reason: "not_found", canEnterCode: true }`.

### B. Comportamiento de la UI (`components/AccessGate.tsx`)
1. **Modo Renovación (`canEnterCode === false`)**:
   - Muestra el ID de referencia del TV (`ID DE REFERÊNCIA DA TV` + `ref_code`).
   - Muestra el estado claro: "Tempo esgotado / Expirado" o "Acesso desativado pelo administrador".
   - Muestra "Entre em contato com o administrador para renovar."
   - **OCULTA COMPLETAMENTE** el formulario `<form>` de entrada de código (`<input>` y botón `Entrar`).
   - Ofrece un botón de verificación manual ("Verificar renovação") y sondeo automático en segundo plano cada 10 segundos para desbloquear de inmediato en cuanto el administrador renueve en `/admin`.
2. **Modo Dispositivo Nuevo o Clave Eliminada (`canEnterCode === true`)**:
   - Limpia referencias obsoletas locales si la clave ya no existe en el servidor.
   - Muestra el título y subtítulo habitual ("Acesso restrito", "Digite seu código para ver os servidores.").
   - **MUESTRA** el formulario con el input `[ Seu código ]` y botón `[ Entrar ]`.

### C. Soporte Multilingüe (`lib/dict.ts`)
Textos de soporte en Portugués (`pt`), Español (`es`) e Inglés (`en`) para:
- Mensajes de estado de expiración y desactivación.
- Botón "Verificar renovación" / "Verificando...".

## 3. Criterios de Aceptación
1. Un dispositivo con clave vencida o desactivada en el servidor solo muestra el ID de referencia y el mensaje para contactar al administrador; el apartado de ingresar código no es visible.
2. Si el administrador renueva la clave en `/admin`, la pantalla se desbloquea automáticamente o al pulsar "Verificar renovación".
3. Si el administrador elimina la clave en `/admin`, el apartado de ingresar código aparece para que el usuario pueda vincular una nueva clave.
4. Un dispositivo nuevo que abre la aplicación por primera vez ve el apartado de ingresar código.
