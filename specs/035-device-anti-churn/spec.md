# Spec 035: Control Anti-Reúso de Dispositivos (Bloqueo de Nuevas Claves con Clave Inactiva o Vencida)

## 1. Problema de Negocio y Vector de Fraude
Los administradores y revendedores de TVShow proporcionan claves demo de prueba gratuitas (ej. 3 días) o planes mensuales. Cuando la clave de un cliente caduca por falta de pago (`expires_at <= now()`) o es desactivada/suspendida por morosidad (`revoked: true` o `suspended_by_billing: true`), algunos usuarios intentan evadir el pago solicitando otra clave demo o consiguiendo una clave nueva con otro nombre e ingresándola en el mismo equipo (Smart TV, celular o PC).

## 2. Requerimientos Funcionales
1. **Identificación Persistente del Dispositivo:**
   - Todo cliente web, Android TV, celular o Windows debe contar con un identificador único persistente (`deviceId`).
   - El identificador debe sobrevivir a reinicios del navegador, recargas de página y borrados casuales de cookies mediante persistencia dual (`localStorage` + cookie de larga duración `tvdev`).
2. **Historial de Vinculación (`device_bindings`):**
   - Cuando un dispositivo activa exitosamente una clave de acceso, queda formalmente vinculado a dicha clave en la base de datos (`device_bindings`).
3. **Regla de Bloqueo Estricto:**
   - Si un dispositivo intenta activar una clave **B**, pero previamente está vinculado a una clave **A**:
     - Si **A == B**: Permitido (ej. el administrador extendió la clave A con +30d y el usuario la reingresa).
     - Si **A != B**: Se verifica el estado de la clave **A**.
       - Si la clave **A** está **VENCIDA** (`expires_at <= now()`) o **DESACTIVADA** (`revoked: true` o `suspended_by_billing: true`), se **BLOQUEA INMEDIATAMENTE** la activación de la clave **B**.
       - Código de error devuelto: `device_blocked_inactive` (HTTP 403).
4. **Mensaje de Orientación y Retención:**
   - La pantalla de bloqueo debe mostrar de manera prominente el código de referencia (`Ref: TV-XXXX-XXXX`) de la clave original inactiva.
   - Texto localizado en Portugués, Español e Inglés indicando al usuario que debe renovar su suscripción original o contactar al administrador.
5. **Mecanismo de Desvinculación Administrativa:**
   - Cuando el administrador presiona "Desvincular todos los dispositivos" en el panel o elimina una clave, se limpian las vinculaciones de `device_bindings`, permitiendo al dispositivo enlazarse de nuevo legítimamente si el administrador así lo autorizó.

## 3. Criterios de Aceptación
- Un dispositivo con clave vencida que intente ingresar una clave nueva recibe HTTP 403 con `device_blocked_inactive`.
- La clave original se puede renovar y reactivar en el mismo dispositivo sin trabas.
- El administrador puede liberar el dispositivo cuando lo considere necesario desde `/admin`.
- Soporte trilingüe completo: Portugués (`pt`), Español (`es`), Inglés (`en`).
