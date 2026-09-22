# Spec 025: Control de Ventas, Cierres de Facturación y Suspensión por Morosidad

## Contexto
TVShow cuenta con una arquitectura multi-administrador donde el `superadmin` delega la venta y renovación de códigos de acceso a revendedores (`admin`). Actualmente:
- No existe un control de tarifas por día ni registro financiero de cuánto debe cada administrador por los códigos generados o renovados.
- No hay fechas de corte programadas (semanales o mensuales) para generar liquidaciones y facturas de cobro.
- No existe una herramienta para que los sub-administradores consulten de forma transparente su saldo adeudado y la fecha de su próximo corte.
- Ante el impago de una liquidación semanal o mensual, el `superadmin` no tiene forma rápida de suspender únicamente los códigos creados o renovados durante el período adeudado sin afectar códigos anteriores pagados.

## Objetivos
- [ ] **Configuración de Precios y Cierres:** Configurar un precio unitario por día (ej. $0.10) y ciclo de facturación (semanal con día de corte específico, o mensual).
- [ ] **Libro Contable de Transacciones (`code_transactions`):** Registrar de forma inmutable cada creación, renovación y extensión de código con: admin, fecha, días asignados, precio por día y total ($).
- [ ] **Cierres e Informes de Liquidación (`billing_periods` y `admin_billing_invoices`):**
  - Generar el informe de cierre por período con el total a pagar por cada administrador.
  - Vista para el `superadmin`: Informe global de deuda, desglose por revendedor, filtro de períodos y gestión de pagos.
  - Vista para el sub-administrador: Pestaña o módulo "Mis Finanzas" donde visualiza en tiempo real su deuda actual, fecha del próximo corte e historial de pagos.
- [ ] **Corte Masivo por Falta de Pago (Suspensión por Morosidad):**
  - Permitir al `superadmin` suspender con un solo clic todos los códigos generados o renovados por un administrador moroso dentro del período cerrado impago.
  - Desvincular de inmediato las sesiones activas de dichos códigos en los dispositivos clientes para cortar la reproducción en vivo.
- [ ] **Reactivación Inmediata al Pagar:**
  - Al marcar la liquidación como pagada, reactivar automáticamente los códigos suspendidos por morosidad (siempre que sigan dentro de su fecha de vigencia).
- [ ] **Cumplimiento de la Constitución:** Interfaz trilingüe (ES / EN / PT), controles accesibles y compilación sin errores (`npm run build`).

## No objetivos
- Pasarelas automáticas de pago con tarjeta de crédito (Stripe/PayPal): el flujo de liquidación entre el superadmin y sus revendedores es B2B manual (transferencia, efectivo, cripto, etc.).
- Facturación electrónica con validez fiscal tributaria gubernamental.

## Criterios de aceptación
- [ ] `POST /api/admin/codes` (crear) y `PATCH /api/admin/codes` (renovar/extender) registran la transacción contable con los días y el monto según el precio por día.
- [ ] `GET /api/admin/billing` devuelve la configuración vigente, períodos de facturación y resumen de deuda.
- [ ] `POST /api/admin/billing/settings` permite al superadmin ajustar el precio por día y el ciclo de cierre (semanal/mensual).
- [ ] `POST /api/admin/billing/periods/close` ejecuta el cierre del período y genera las liquidaciones por admin.
- [ ] `POST /api/admin/billing/suspend` revoca masivamente los códigos del período para un admin moroso y purga sus sesiones activas.
- [ ] `POST /api/admin/billing/reactivate` restaura los códigos suspendidos por morosidad tras registrar el pago.
- [ ] El sub-admin ve únicamente sus propias finanzas y deuda, mientras que el superadmin ve el consolidado de toda la red.
- [ ] `npm run test:sources` y `npm run build` pasan al 100%.

## Restricciones
- Constitución: 1 (Trilingüe ES/EN/PT en `lib/dict.ts`), 2 (Sin secretos en repo), 3 (`npm run build` verde), 6 (Móvil y TV accesibles).
