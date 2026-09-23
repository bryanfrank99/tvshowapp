# Plan Técnico: Spec 035 - Control Anti-Reúso de Dispositivos

## 1. Arquitectura de Datos

### Tabla `device_bindings` (Supabase)
```sql
create table if not exists device_bindings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  code_id uuid not null references access_codes(id) on delete cascade,
  device_hint text default 'Dispositivo',
  ip text default '',
  first_bound_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(device_id, code_id)
);

create index if not exists idx_device_bindings_dev on device_bindings(device_id);
create index if not exists idx_device_bindings_code on device_bindings(code_id);

alter table device_bindings disable row level security;
```

## 2. Componentes y Flujos

### A. Frontend: `lib/device-id.ts`
- Utilidad del lado del cliente para recuperar o crear un `deviceId` único (`DEV-<12 hex chars>`).
- Persiste en `localStorage.getItem("tvshow_device_id")` y cookie de cliente `tvdev`.
- Genera huella auxiliar de dispositivo como fallback.

### B. Backend: `lib/access.ts`
- Función `checkDeviceEligibility(deviceId: string, targetCodeId: string)`:
  - Busca en `device_bindings` vinculaciones para `deviceId`.
  - Verifica si existe alguna clave diferente que esté expirada o revocada.
  - Retorna `{ eligible: boolean, reason?: string, boundRef?: string, boundLabel?: string }`.
- Función `bindDeviceToCode(deviceId: string, codeId: string, deviceHint?: string, ip?: string)`:
  - Registra o actualiza `device_bindings`.
- `resetSessionsForCode(codeId: string)`:
  - Elimina también registros en `device_bindings` para el `code_id`.

### C. Endpoint: `POST /api/access`
- Extrae `deviceId` del cuerpo JSON o de la cookie `tvdev`.
- Si `checkDeviceEligibility` retorna `eligible: false`:
  - Retorna `403 Forbidden` con `{ ok: false, error: "device_blocked_inactive", ref_code: boundRef, label: boundLabel }`.
- Si es elegible, crea la sesión y enlaza el dispositivo vía `bindDeviceToCode`.

### D. Diccionarios y UI:
- `lib/dict.ts`:
  - `gate_device_blocked(ref: string)` para los 3 idiomas (`es`, `pt`, `en`).
- `components/AccessGate.tsx` y `components/AutoAccessHandler.tsx`:
  - Capturan el error `device_blocked_inactive` y presentan el mensaje explicativo con el `ref_code` de su clave previa.
