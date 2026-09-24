import type { Lang } from "@/lib/dict";

export interface AdminDict {
  // Login
  login_title: string;
  login_subtitle: string;
  login_user: string;
  login_pass: string;
  login_btn: string;
  login_verifying: string;
  login_err_default: string;
  login_err_conn: string;

  // Header & Profile
  console_title: string;
  connected_as: string;
  role_super: string;
  role_manager: string;
  btn_my_pass: string;
  btn_logout: string;

  // Tabs
  tab_codes: string;
  tab_my_codes: string;
  tab_admins: string;
  tab_prov: string;
  tab_live: string;
  tab_billing_super: string;
  tab_billing_reseller: string;

  // Relative Time & Status
  time_no_connections: string;
  time_just_now: string;
  time_mins_ago: (n: number) => string;
  time_hours_ago: (n: number) => string;
  time_yesterday: string;
  time_days_ago: (n: number) => string;

  // Codes - KPIs
  kpi_active_codes: string;
  kpi_operating_normal: string;
  kpi_connected_devices: string;
  kpi_limit_devices: string;
  kpi_expiring_soon: string;
  kpi_require_renewal: string;
  kpi_full_capacity: string;
  kpi_quota_full: string;

  // Codes - Form
  code_label_ph: string;
  code_lifetime_badge: string;
  code_trial_badge: string;
  code_generate_btn: string;
  code_lifetime_checkbox: string;
  code_lifetime_hint: string;
  code_trial_hint: string;

  // Codes - New Code Banner
  new_code_title: string;
  new_code_max_devices: string;
  new_code_desc: string;
  copy_code: string;
  copied_code: string;
  copy_link: string;
  copied_link: string;

  // Codes - Filters & Search
  filter_all: string;
  filter_active: string;
  filter_expiring: string;
  filter_full: string;
  filter_expired: string;
  filter_admin_label: string;
  filter_all_admins: string;
  search_ph: string;

  // Codes - Cards & Actions
  no_label: string;
  status_revoked: string;
  status_lifetime: string;
  status_expired: string;
  status_expires_in: (days: number) => string;
  status_expires_date: string;
  status_days_left: (days: number) => string;
  status_devices_badge: (count: number, max: number) => string;
  status_last_seen: string;
  btn_release_slots: (max: number) => string;
  badge_permanent: string;
  btn_reactivate: string;
  btn_revoke: string;
  btn_delete: string;
  devices_linked_title: (count: number, max: number) => string;
  devices_none: string;
  device_seen: string;
  confirm_reset_sessions: (label: string) => string;
  confirm_delete_code: (label: string) => string;
  msg_slots_released: string;
  msg_extend_success: (days: number) => string;
  msg_extend_error: string;
  msg_gen_error: string;

  // Admins Tab
  admins_title: string;
  admins_subtitle: string;
  btn_new_admin: string;
  th_admin: string;
  th_role: string;
  th_active_codes: string;
  th_total_codes: string;
  th_devices: string;
  th_last_login: string;
  th_status: string;
  th_actions: string;
  badge_you: string;
  btn_active: string;
  btn_suspended: string;
  btn_key_pass: string;
  confirm_toggle_admin: (action: string, user: string, warning: string) => string;
  confirm_delete_admin: (user: string) => string;
  confirm_change_role: (user: string, role: string) => string;
  role_promote_super: string;
  role_demote_manager: string;

  // Providers Tab
  prov_new: string;
  prov_diagnose: string;
  prov_diagnosing: string;
  prov_healthy: (ms: number) => string;
  prov_slow: (ms: number) => string;
  prov_waf: (ms: number) => string;
  prov_down: string;
  prov_inactive: string;
  prov_activate: string;
  prov_deactivate: string;
  prov_edit: string;
  prov_delete: string;
  prov_id_ph: string;
  prov_name_ph: string;
  prov_audio_langs: string;
  prov_subs_langs: string;
  prov_movie_tpl: string;
  prov_tv_tpl: string;
  prov_entry_key: string;
  prov_beta_title: string;
  prov_beta_desc: string;
  prov_save: string;
  prov_cancel: string;

  // Live TV Tab
  live_new: string;
  live_url_ph: string;
  live_save: string;

  // Billing Tab
  bill_title_super: string;
  bill_title_reseller: string;
  bill_sub_super: string;
  bill_sub_reseller: string;
  bill_btn_refresh: string;
  bill_btn_refreshing: string;
  bill_btn_close_period: string;
  bill_btn_closing: string;
  bill_kpi_open_cycle: string;
  bill_kpi_open_cycle_sub: string;
  bill_kpi_pending_debt: string;
  bill_kpi_pending_debt_sub: string;
  bill_kpi_total_paid: string;
  bill_kpi_total_paid_sub: string;
  bill_kpi_cuts: string;
  bill_kpi_cuts_sub: string;
  bill_reseller_title: string;
  bill_reseller_due_desc: string;
  bill_reseller_sold_summary: (codes: number, pkgs: number) => string;
  bill_rate_package_label: string;
  bill_frequency_label: string;
  bill_closing_day_label: string;
  bill_weekly: string;
  bill_monthly: string;
  bill_day_names: string[];
  bill_day_prefix: string;
  bill_settings_title: string;
  bill_settings_sub: string;
  bill_price_30d_label: string;
  bill_margin_percent_label: string;
  bill_reseller_profit_label: string;
  bill_real_due_label: string;
  bill_gross_sales_label: string;
  bill_my_profit_label: string;
  bill_margin_preview: (base: string, margin: number, profit: string, due: string) => string;
  bill_cycle_label: string;
  bill_btn_save_rate: string;
  bill_btn_saving_rate: string;
  bill_model_expl: (price: string) => string;
  bill_curr_balance_title: string;
  bill_curr_balance_sub: string;
  bill_curr_empty: string;
  bill_history_title_super: string;
  bill_history_title_reseller: string;
  bill_history_sub_super: string;
  bill_history_sub_reseller: string;
  bill_history_empty: string;
  bill_status_suspended: string;
  bill_status_paid: string;
  bill_status_pending: string;
  bill_btn_mark_paid: string;
  bill_btn_suspend_codes: string;
  bill_btn_reactivate_paid: string;
  bill_tx_title_super: string;
  bill_tx_title_reseller: string;
  bill_tx_empty: string;
  bill_tx_create: string;
  bill_tx_renew: string;
  bill_tx_extend: string;

  // Modals
  modal_suspend_title: string;
  modal_suspend_desc: (admin: string, amount: string) => string;
  modal_suspend_warning_title: string;
  modal_suspend_li1: string;
  modal_suspend_li2: string;
  modal_suspend_li3: string;
  modal_suspend_confirm: string;
  modal_suspend_processing: string;
  modal_reactivate_title: string;
  modal_reactivate_desc: (admin: string, amount: string) => string;
  modal_reactivate_auto_title: string;
  modal_reactivate_li1: string;
  modal_reactivate_li2: string;
  modal_reactivate_li3: string;
  modal_reactivate_confirm: string;
  modal_reactivate_processing: string;
  modal_new_admin_title: string;
  modal_admin_name: string;
  modal_admin_name_ph: string;
  modal_admin_user: string;
  modal_admin_user_hint: string;
  modal_admin_pass: string;
  modal_admin_pass_ph: string;
  modal_admin_role: string;
  modal_role_admin: string;
  modal_role_super: string;
  modal_btn_create_admin: string;
  modal_change_pass_title: (username: string) => string;
  modal_new_pass: string;
  modal_new_pass_hint: string;
  modal_btn_update_pass: string;
  cancel: string;
}

const es: AdminDict = {
  login_title: "Panel de Administración",
  login_subtitle: "Servidor y gestión de accesos",
  login_user: "Usuario",
  login_pass: "Contraseña",
  login_btn: "Iniciar Sesión",
  login_verifying: "Verificando credenciales...",
  login_err_default: "Usuario o contraseña incorrectos",
  login_err_conn: "Error de conexión al iniciar sesión",

  console_title: "Admin Console",
  connected_as: "Conectado como:",
  role_super: "Super Admin",
  role_manager: "Gestor de Claves",
  btn_my_pass: "🔑 Mi Contraseña",
  btn_logout: "Cerrar Sesión",

  tab_codes: "Claves de Acceso",
  tab_my_codes: "Mis Claves",
  tab_admins: "Administradores",
  tab_prov: "Servidores",
  tab_live: "Live TV",
  tab_billing_super: "💰 Finanzas & Cobros",
  tab_billing_reseller: "💰 Mis Finanzas",

  time_no_connections: "Sin conexiones",
  time_just_now: "Hace un momento",
  time_mins_ago: (n) => `Hace ${n} min`,
  time_hours_ago: (n) => `Hace ${n} h`,
  time_yesterday: "Ayer",
  time_days_ago: (n) => `Hace ${n} días`,

  kpi_active_codes: "Claves Activas",
  kpi_operating_normal: "Operando normalmente",
  kpi_connected_devices: "Dispositivos Conectados",
  kpi_limit_devices: "Límite: 3 por código",
  kpi_expiring_soon: "Por Vencer (≤ 7 días)",
  kpi_require_renewal: "Requieren renovación",
  kpi_full_capacity: "Capacidad Llena (3/3)",
  kpi_quota_full: "Cupo completo",

  code_label_ph: "Etiqueta / Cliente (ej. Familia Pérez, Habitación 2)",
  code_lifetime_badge: "♾️ Sin límite de tiempo (Vitalicia)",
  code_trial_badge: "🎁 Primera clave: 3 días Gratis",
  code_generate_btn: "Generar Clave",
  code_lifetime_checkbox: "Generar clave sin límite de tiempo (Exclusivo Administrador General)",
  code_lifetime_hint: "Esta clave nunca caducará y no genera cobros",
  code_trial_hint: "Primera clave estándar de prueba de 3 días (luego ampliable a 30d, 90d o 360d)",

  new_code_title: "¡Nueva clave generada con éxito!",
  new_code_max_devices: "Máx. 3 dispositivos",
  new_code_desc: "Por motivos de seguridad el código solo se muestra en este momento. Cópialo o comparte el enlace directo:",
  copy_code: "Copiar Código",
  copied_code: "✓ Código Copiado",
  copy_link: "🔗 Copiar Enlace Rápido",
  copied_link: "✓ Enlace Copiado",

  filter_all: "Todos",
  filter_active: "Activos",
  filter_expiring: "Por Vencer",
  filter_full: "Llenos 3/3",
  filter_expired: "Caducados",
  filter_admin_label: "Admin:",
  filter_all_admins: "Todos los admins",
  search_ph: "Buscar etiqueta, ref o admin...",

  no_label: "(Sin etiqueta)",
  status_revoked: "Revocado",
  status_lifetime: "Vitalicia",
  status_expired: "Caducado",
  status_expires_in: (days) => `Vence en ${days}d`,
  status_expires_date: "Expira:",
  status_days_left: (days) => `(${days}d restantes)`,
  status_devices_badge: (count, max) => `📱 ${count}/${max} dispositivos`,
  status_last_seen: "Última conexión:",
  btn_release_slots: (max) => `Liberar cupos (0/${max})`,
  badge_permanent: "Permanente",
  btn_reactivate: "Reactivar",
  btn_revoke: "Revocar",
  btn_delete: "Borrar",
  devices_linked_title: (count, max) => `Dispositivos vinculados (${count}/${max}):`,
  devices_none: "Aún no se ha conectado ningún dispositivo con este código.",
  device_seen: "Visto:",
  confirm_reset_sessions: (label) => `¿Desvincular todos los dispositivos de "${label || "este código"}"?\nSe liberarán los 3 cupos para permitir conectar nuevos dispositivos.`,
  confirm_delete_code: (label) => `¿Eliminar código "${label}"?\nEsto cancelará también todas sus sesiones activas.`,
  msg_slots_released: "Dispositivos desvinculados correctamente. Cupos liberados (0/3).",
  msg_extend_success: (days) => `Plazo extendido por +${days} días exitosamente`,
  msg_extend_error: "Error extendiendo plazo",
  msg_gen_error: "Error generando código",

  admins_title: "Gestión de Administradores",
  admins_subtitle: "Concede o suspende accesos al servidor y supervisa las claves de cada administrador.",
  btn_new_admin: "+ Nuevo Administrador",
  th_admin: "Administrador",
  th_role: "Rol",
  th_active_codes: "Claves Activas",
  th_total_codes: "Total Claves",
  th_devices: "Dispositivos",
  th_last_login: "Último Acceso",
  th_status: "Estado",
  th_actions: "Acciones",
  badge_you: "Tú",
  btn_active: "● Activo",
  btn_suspended: "○ Suspendido",
  btn_key_pass: "🔑 Clave",
  confirm_toggle_admin: (action, user, warning) => `¿Deseas ${action} la cuenta de @${user}?\n${warning}`,
  confirm_delete_admin: (user) => `¿Eliminar administrador @${user}?\nEsta acción no se puede deshacer.`,
  confirm_change_role: (user, role) => `¿Deseas cambiar el rol de @${user} a "${role}"?`,
  role_promote_super: "Promover a Super Admin",
  role_demote_manager: "Cambiar a Gestor de Claves",

  prov_new: "+ Nuevo Servidor",
  prov_diagnose: "Diagnosticar Servidores",
  prov_diagnosing: "Diagnosticando servidores...",
  prov_healthy: (ms) => `${ms}ms`,
  prov_slow: (ms) => `Lento (${ms}ms)`,
  prov_waf: (ms) => `WAF (${ms}ms)`,
  prov_down: "Caído",
  prov_inactive: "inactivo",
  prov_activate: "Activar",
  prov_deactivate: "Desactivar",
  prov_edit: "Editar",
  prov_delete: "Borrar",
  prov_id_ph: "ID único (ej. megaembed)",
  prov_name_ph: "Nombre público",
  prov_audio_langs: "Idiomas de Audio Disponibles:",
  prov_subs_langs: "Subtítulos Integrados (opcional):",
  prov_movie_tpl: "Plantilla movie (…{id}…)",
  prov_tv_tpl: "Plantilla tv (…{id}…{s}…{e}…)",
  prov_entry_key: "key propia (opcional)",
  prov_beta_title: "🧪 Servidor en fase Beta (Experimental)",
  prov_beta_desc: "Los servidores Beta nunca saldrán por defecto al reproducir. Solo se cargarán si el usuario hace clic en ellos.",
  prov_save: "Guardar Servidor",
  prov_cancel: "Cancelar",

  live_new: "+ Nueva fuente Live",
  live_url_ph: "URL del listado",
  live_save: "Guardar",

  bill_title_super: "Control de Ventas y Liquidaciones",
  bill_title_reseller: "Mi Estado de Cuenta y Finanzas",
  bill_sub_super: "Supervisión financiera de revendedores, configuración de tarifas por día, cierres de corte y gestión de morosidad.",
  bill_sub_reseller: "Auditoría de códigos generados, saldo acumulado del ciclo actual y fechas de corte.",
  bill_btn_refresh: "Refrescar",
  bill_btn_refreshing: "Actualizando...",
  bill_btn_close_period: "Ejecutar Cierre de Período",
  bill_btn_closing: "Cerrando...",
  bill_kpi_open_cycle: "Ventas Ciclo Abierto",
  bill_kpi_open_cycle_sub: "En curso para próximo corte",
  bill_kpi_pending_debt: "Deuda Pendiente Cobro",
  bill_kpi_pending_debt_sub: "Liquidaciones cerradas sin pagar",
  bill_kpi_total_paid: "Total Cobrado",
  bill_kpi_total_paid_sub: "Liquidaciones cobradas con éxito",
  bill_kpi_cuts: "Cortes por Morosidad",
  bill_kpi_cuts_sub: "Períodos suspendidos",
  bill_reseller_title: "Estado de Cuenta Actual",
  bill_reseller_due_desc: "a pagar en el próximo corte",
  bill_reseller_sold_summary: (codes, pkgs) => `Has vendido/renovado ${codes} códigos (${pkgs} paquetes de 30d) durante este ciclo.`,
  bill_rate_package_label: "Tarifa Paquete 30 Días:",
  bill_frequency_label: "Frecuencia de corte:",
  bill_closing_day_label: "Día de cierre:",
  bill_weekly: "Semanal",
  bill_monthly: "Mensual",
  bill_day_names: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  bill_day_prefix: "Día",
  bill_settings_title: "Tarifas y Configuración de Cierre",
  bill_settings_sub: "Define el precio por paquete mensual de 30 días y el ciclo de corte programado para los revendedores.",
  bill_price_30d_label: "Precio Paquete 30 Días ($ USD)",
  bill_margin_percent_label: "Margen de Ganancia Revendedor (%)",
  bill_reseller_profit_label: "Ganancia Revendedor",
  bill_real_due_label: "A Pagar (Valor Real)",
  bill_gross_sales_label: "Venta Bruta",
  bill_my_profit_label: "Tu Ganancia Neta",
  bill_margin_preview: (base, margin, profit, due) => `Por cada paquete de $${base} USD con ${margin}% de margen: el revendedor gana $${profit} USD y te debe pagar $${due} USD.`,
  bill_cycle_label: "Ciclo de Cierre",
  bill_btn_save_rate: "Guardar Tarifa",
  bill_btn_saving_rate: "Guardando...",
  bill_model_expl: (price) => `Modelo de Paquetes de 30 Días: Toda la facturación opera en múltiplos de 30 días a $${price || "10.00"} USD / paquete. Las extensiones de tiempo aplican: 30d ($10), 90d ($30) y 360d ($120). La primera clave demo de 3 días y las claves vitalicias no generan costo.`,
  bill_curr_balance_title: "Balance Acumulado del Ciclo en Curso (No Cerrado)",
  bill_curr_balance_sub: "Ventas y renovaciones registradas desde el último corte. Este monto se liquidará al ejecutar el próximo cierre.",
  bill_curr_empty: "No hay ventas ni renovaciones registradas en el período en curso todavía.",
  bill_history_title_super: "Liquidaciones de Cierres de Facturación",
  bill_history_title_reseller: "Mis Liquidaciones y Pagos",
  bill_history_sub_super: "Historial de períodos cerrados. Puedes registrar pagos, o suspender/reactivar masivamente los códigos ante impago.",
  bill_history_sub_reseller: "Historial de tus períodos liquidados por el Administrador General y comprobantes de estado.",
  bill_history_empty: "Aún no se han ejecutado cierres de período. Las liquidaciones aparecerán aquí tras el primer corte programado.",
  bill_status_suspended: "🛑 Suspendido por Morosidad",
  bill_status_paid: "✓ Pagado",
  bill_status_pending: "⏳ Pendiente de Pago",
  bill_btn_mark_paid: "✓ Marcar Pagado",
  bill_btn_suspend_codes: "🛑 Suspender Códigos",
  bill_btn_reactivate_paid: "🔄 Reactivar & Registrar Pago",
  bill_tx_title_super: "Libro Contable de Ventas Recientes",
  bill_tx_title_reseller: "Mis Ventas y Renovaciones Recientes",
  bill_tx_empty: "No hay transacciones registradas todavía.",
  bill_tx_create: "Creación",
  bill_tx_renew: "Renovación",
  bill_tx_extend: "Extensión",

  modal_suspend_title: "¿Suspender códigos por falta de pago?",
  modal_suspend_desc: (admin, amount) => `Estás a punto de suspender masivamente los códigos generados o renovados por el administrador @${admin} correspondientes a esta liquidación ($${amount} USD).`,
  modal_suspend_warning_title: "⚠️ Consecuencias inmediatas:",
  modal_suspend_li1: "Los códigos del período quedarán revocados en el sistema.",
  modal_suspend_li2: "Se expulsarán todas las sesiones activas en dispositivos clientes.",
  modal_suspend_li3: "Los usuarios finales verán el candado de acceso y no podrán reproducir.",
  modal_suspend_confirm: "Sí, Desactivar Códigos Ahora",
  modal_suspend_processing: "Desactivando códigos...",
  modal_reactivate_title: "Reactivar códigos y registrar pago",
  modal_reactivate_desc: (admin, amount) => `El administrador @${admin} ha cumplido con el pago de $${amount} USD.`,
  modal_reactivate_auto_title: "✓ Acciones automáticas:",
  modal_reactivate_li1: "Se reactivarán los códigos suspendidos que sigan dentro de su fecha de expiración.",
  modal_reactivate_li2: "La liquidación quedará archivada en estado Pagado.",
  modal_reactivate_li3: "Los clientes podrán volver a ingresar sin necesidad de crear claves nuevas.",
  modal_reactivate_confirm: "Reactivar y Marcar Pagado",
  modal_reactivate_processing: "Reactivando...",
  modal_new_admin_title: "Nuevo Administrador",
  modal_admin_name: "Nombre o Alias (Identificador)",
  modal_admin_name_ph: "ej. Carlos - Ventas Norte",
  modal_admin_user: "Nombre de Usuario (Login)",
  modal_admin_user_hint: "Solo minúsculas, números, guiones y guiones bajos.",
  modal_admin_pass: "Contraseña Inicial",
  modal_admin_pass_ph: "Mínimo 6 caracteres",
  modal_admin_role: "Rol y Permisos",
  modal_role_admin: "Gestor de Claves (Solo administra sus propias claves)",
  modal_role_super: "Super Administrador (Control total del servidor)",
  modal_btn_create_admin: "Crear Administrador",
  modal_change_pass_title: (u) => `Cambiar Contraseña: @${u}`,
  modal_new_pass: "Nueva Contraseña",
  modal_new_pass_hint: "Al cambiar la contraseña, las sesiones activas de este administrador se cerrarán automáticamente.",
  modal_btn_update_pass: "Actualizar Contraseña",
  cancel: "Cancelar",
};

const en: AdminDict = {
  login_title: "Admin Panel",
  login_subtitle: "Server & access management",
  login_user: "Username",
  login_pass: "Password",
  login_btn: "Sign In",
  login_verifying: "Verifying credentials...",
  login_err_default: "Incorrect username or password",
  login_err_conn: "Connection error while signing in",

  console_title: "Admin Console",
  connected_as: "Logged in as:",
  role_super: "Super Admin",
  role_manager: "Key Manager",
  btn_my_pass: "🔑 My Password",
  btn_logout: "Log Out",

  tab_codes: "Access Keys",
  tab_my_codes: "My Keys",
  tab_admins: "Administrators",
  tab_prov: "Servers",
  tab_live: "Live TV",
  tab_billing_super: "💰 Finance & Billing",
  tab_billing_reseller: "💰 My Finances",

  time_no_connections: "No connections",
  time_just_now: "Just now",
  time_mins_ago: (n) => `${n} min ago`,
  time_hours_ago: (n) => `${n} h ago`,
  time_yesterday: "Yesterday",
  time_days_ago: (n) => `${n} days ago`,

  kpi_active_codes: "Active Keys",
  kpi_operating_normal: "Operating normally",
  kpi_connected_devices: "Connected Devices",
  kpi_limit_devices: "Limit: 3 per code",
  kpi_expiring_soon: "Expiring Soon (≤ 7 days)",
  kpi_require_renewal: "Require renewal",
  kpi_full_capacity: "Full Capacity (3/3)",
  kpi_quota_full: "Quota full",

  code_label_ph: "Label / Client (e.g. Smith Family, Bedroom 2)",
  code_lifetime_badge: "♾️ No time limit (Lifetime)",
  code_trial_badge: "🎁 First key: 3 days Free",
  code_generate_btn: "Generate Key",
  code_lifetime_checkbox: "Generate key without time limit (Super Admin exclusive)",
  code_lifetime_hint: "This key will never expire and incurs no charges",
  code_trial_hint: "Standard 3-day trial key (extendable to 30d, 90d or 360d later)",

  new_code_title: "New key successfully generated!",
  new_code_max_devices: "Max. 3 devices",
  new_code_desc: "For security reasons, this code is only shown right now. Copy it or share the direct link:",
  copy_code: "Copy Code",
  copied_code: "✓ Code Copied",
  copy_link: "🔗 Copy Quick Link",
  copied_link: "✓ Link Copied",

  filter_all: "All",
  filter_active: "Active",
  filter_expiring: "Expiring",
  filter_full: "Full 3/3",
  filter_expired: "Expired",
  filter_admin_label: "Admin:",
  filter_all_admins: "All admins",
  search_ph: "Search label, ref or admin...",

  no_label: "(No label)",
  status_revoked: "Revoked",
  status_lifetime: "Lifetime",
  status_expired: "Expired",
  status_expires_in: (days) => `Expires in ${days}d`,
  status_expires_date: "Expires:",
  status_days_left: (days) => `(${days}d remaining)`,
  status_devices_badge: (count, max) => `📱 ${count}/${max} devices`,
  status_last_seen: "Last connection:",
  btn_release_slots: (max) => `Free slots (0/${max})`,
  badge_permanent: "Permanent",
  btn_reactivate: "Reactivate",
  btn_revoke: "Revoke",
  btn_delete: "Delete",
  devices_linked_title: (count, max) => `Linked devices (${count}/${max}):`,
  devices_none: "No device has connected with this code yet.",
  device_seen: "Seen:",
  confirm_reset_sessions: (label) => `Unlink all devices from "${label || "this code"}"?\nAll 3 slots will be released to connect new devices.`,
  confirm_delete_code: (label) => `Delete code "${label}"?\nThis will also terminate all its active sessions.`,
  msg_slots_released: "Devices successfully unlinked. Slots released (0/3).",
  msg_extend_success: (days) => `Term successfully extended by +${days} days`,
  msg_extend_error: "Error extending term",
  msg_gen_error: "Error generating code",

  admins_title: "Administrator Management",
  admins_subtitle: "Grant or suspend server access and supervise keys for each administrator.",
  btn_new_admin: "+ New Administrator",
  th_admin: "Administrator",
  th_role: "Role",
  th_active_codes: "Active Keys",
  th_total_codes: "Total Keys",
  th_devices: "Devices",
  th_last_login: "Last Access",
  th_status: "Status",
  th_actions: "Actions",
  badge_you: "You",
  btn_active: "● Active",
  btn_suspended: "○ Suspended",
  btn_key_pass: "🔑 Pass",
  confirm_toggle_admin: (action, user, warning) => `Do you want to ${action} the account for @${user}?\n${warning}`,
  confirm_delete_admin: (user) => `Delete administrator @${user}?\nThis action cannot be undone.`,
  confirm_change_role: (user, role) => `Do you want to change the role of @${user} to "${role}"?`,
  role_promote_super: "Promote to Super Admin",
  role_demote_manager: "Change to Key Manager",

  prov_new: "+ New Server",
  prov_diagnose: "Diagnose Servers",
  prov_diagnosing: "Diagnosing servers...",
  prov_healthy: (ms) => `${ms}ms`,
  prov_slow: (ms) => `Slow (${ms}ms)`,
  prov_waf: (ms) => `WAF (${ms}ms)`,
  prov_down: "Down",
  prov_inactive: "inactive",
  prov_activate: "Activate",
  prov_deactivate: "Deactivate",
  prov_edit: "Edit",
  prov_delete: "Delete",
  prov_id_ph: "Unique ID (e.g. megaembed)",
  prov_name_ph: "Public name",
  prov_audio_langs: "Available Audio Languages:",
  prov_subs_langs: "Integrated Subtitles (optional):",
  prov_movie_tpl: "Movie template (…{id}…)",
  prov_tv_tpl: "TV template (…{id}…{s}…{e}…)",
  prov_entry_key: "Custom key (optional)",
  prov_beta_title: "🧪 Beta Server (Experimental)",
  prov_beta_desc: "Beta servers are never selected by default. They will only play when clicked directly by users.",
  prov_save: "Save Server",
  prov_cancel: "Cancel",

  live_new: "+ New Live Source",
  live_url_ph: "Playlist URL",
  live_save: "Save",

  bill_title_super: "Sales & Settlement Control",
  bill_title_reseller: "My Account Statement & Finances",
  bill_sub_super: "Financial oversight of resellers, package rates, period closures, and delinquency management.",
  bill_sub_reseller: "Audit of generated codes, accumulated balance for current cycle, and closing dates.",
  bill_btn_refresh: "Refresh",
  bill_btn_refreshing: "Refreshing...",
  bill_btn_close_period: "Execute Period Closing",
  bill_btn_closing: "Closing...",
  bill_kpi_open_cycle: "Open Cycle Sales",
  bill_kpi_open_cycle_sub: "In progress for next closing",
  bill_kpi_pending_debt: "Pending Collection Debt",
  bill_kpi_pending_debt_sub: "Closed unpaid settlements",
  bill_kpi_total_paid: "Total Collected",
  bill_kpi_total_paid_sub: "Successfully paid settlements",
  bill_kpi_cuts: "Non-Payment Suspensions",
  bill_kpi_cuts_sub: "Suspended periods",
  bill_reseller_title: "Current Account Statement",
  bill_reseller_due_desc: "due on next closing",
  bill_reseller_sold_summary: (codes, pkgs) => `You have sold/renewed ${codes} codes (${pkgs} 30-day packages) during this cycle.`,
  bill_rate_package_label: "30-Day Package Rate:",
  bill_frequency_label: "Closing frequency:",
  bill_closing_day_label: "Closing day:",
  bill_weekly: "Weekly",
  bill_monthly: "Monthly",
  bill_day_names: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  bill_day_prefix: "Day",
  bill_settings_title: "Rates & Closing Configuration",
  bill_settings_sub: "Define the price per 30-day package and the scheduled closing cycle for resellers.",
  bill_price_30d_label: "30-Day Package Price ($ USD)",
  bill_margin_percent_label: "Reseller Profit Margin (%)",
  bill_reseller_profit_label: "Reseller Profit",
  bill_real_due_label: "Payable (Real Value)",
  bill_gross_sales_label: "Gross Sales",
  bill_my_profit_label: "Your Net Profit",
  bill_margin_preview: (base, margin, profit, due) => `For each $${base} USD package with ${margin}% margin: the reseller earns $${profit} USD and owes you $${due} USD.`,
  bill_cycle_label: "Closing Cycle",
  bill_btn_save_rate: "Save Rate",
  bill_btn_saving_rate: "Saving...",
  bill_model_expl: (price) => `30-Day Package Model: All billing operates in multiples of 30 days at $${price || "10.00"} USD / package. Time extensions apply: 30d ($10), 90d ($30), and 360d ($120). Initial 3-day demo keys and lifetime keys generate no charges.`,
  bill_curr_balance_title: "Accumulated Current Cycle Balance (Open)",
  bill_curr_balance_sub: "Sales and renewals recorded since last cut. This amount will settle upon closing.",
  bill_curr_empty: "No sales or renewals recorded in the ongoing period yet.",
  bill_history_title_super: "Billing Settlement History",
  bill_history_title_reseller: "My Settlements & Payments",
  bill_history_sub_super: "History of closed periods. Register payments or suspend/reactivate codes in bulk upon non-payment.",
  bill_history_sub_reseller: "History of your settled periods by the Super Admin and payment vouchers.",
  bill_history_empty: "No period closures have been run yet. Settlements will appear after the first scheduled closing.",
  bill_status_suspended: "🛑 Suspended for Non-Payment",
  bill_status_paid: "✓ Paid",
  bill_status_pending: "⏳ Payment Pending",
  bill_btn_mark_paid: "✓ Mark Paid",
  bill_btn_suspend_codes: "🛑 Suspend Codes",
  bill_btn_reactivate_paid: "🔄 Reactivate & Record Payment",
  bill_tx_title_super: "Recent Sales Accounting Ledger",
  bill_tx_title_reseller: "My Recent Sales & Renewals",
  bill_tx_empty: "No transactions recorded yet.",
  bill_tx_create: "Creation",
  bill_tx_renew: "Renewal",
  bill_tx_extend: "Extension",

  modal_suspend_title: "Suspend codes due to non-payment?",
  modal_suspend_desc: (admin, amount) => `You are about to mass suspend codes generated or renewed by administrator @${admin} for this settlement ($${amount} USD).`,
  modal_suspend_warning_title: "⚠️ Immediate consequences:",
  modal_suspend_li1: "All codes for this period will be revoked immediately.",
  modal_suspend_li2: "All active client device sessions will be kicked out.",
  modal_suspend_li3: "End users will see the lock screen and cannot stream.",
  modal_suspend_confirm: "Yes, Deactivate Codes Now",
  modal_suspend_processing: "Deactivating codes...",
  modal_reactivate_title: "Reactivate codes and record payment",
  modal_reactivate_desc: (admin, amount) => `Administrator @${admin} has paid the amount of $${amount} USD.`,
  modal_reactivate_auto_title: "✓ Automatic actions:",
  modal_reactivate_li1: "Suspended codes that have not yet expired will be reactivated.",
  modal_reactivate_li2: "The settlement will be archived as Paid.",
  modal_reactivate_li3: "Clients will regain access without needing new codes.",
  modal_reactivate_confirm: "Reactivate & Mark Paid",
  modal_reactivate_processing: "Reactivating...",
  modal_new_admin_title: "New Administrator",
  modal_admin_name: "Name or Alias (Identifier)",
  modal_admin_name_ph: "e.g. Carlos - Sales North",
  modal_admin_user: "Username (Login)",
  modal_admin_user_hint: "Only lowercase letters, numbers, hyphens, and underscores.",
  modal_admin_pass: "Initial Password",
  modal_admin_pass_ph: "Minimum 6 characters",
  modal_admin_role: "Role & Permissions",
  modal_role_admin: "Key Manager (Only manages own keys)",
  modal_role_super: "Super Administrator (Full server control)",
  modal_btn_create_admin: "Create Administrator",
  modal_change_pass_title: (u) => `Change Password: @${u}`,
  modal_new_pass: "New Password",
  modal_new_pass_hint: "Changing password will automatically invalidate all active sessions for this administrator.",
  modal_btn_update_pass: "Update Password",
  cancel: "Cancel",
};

const pt: AdminDict = {
  login_title: "Painel de Administração",
  login_subtitle: "Servidor e gerenciamento de acessos",
  login_user: "Usuário",
  login_pass: "Senha",
  login_btn: "Entrar",
  login_verifying: "Verificando credenciais...",
  login_err_default: "Usuário ou senha incorretos",
  login_err_conn: "Erro de conexão ao entrar",

  console_title: "Admin Console",
  connected_as: "Conectado como:",
  role_super: "Super Admin",
  role_manager: "Gerenciador de Chaves",
  btn_my_pass: "🔑 Minha Senha",
  btn_logout: "Sair",

  tab_codes: "Chaves de Acesso",
  tab_my_codes: "Minhas Chaves",
  tab_admins: "Administradores",
  tab_prov: "Servidores",
  tab_live: "Live TV",
  tab_billing_super: "💰 Finanças e Cobranças",
  tab_billing_reseller: "💰 Minhas Finanças",

  time_no_connections: "Sem conexões",
  time_just_now: "Há um momento",
  time_mins_ago: (n) => `Há ${n} min`,
  time_hours_ago: (n) => `Há ${n} h`,
  time_yesterday: "Ontem",
  time_days_ago: (n) => `Há ${n} dias`,

  kpi_active_codes: "Chaves Ativas",
  kpi_operating_normal: "Operando normalmente",
  kpi_connected_devices: "Dispositivos Conectados",
  kpi_limit_devices: "Limite: 3 por código",
  kpi_expiring_soon: "A Vencer (≤ 7 dias)",
  kpi_require_renewal: "Requerem renovação",
  kpi_full_capacity: "Capacidade Máxima (3/3)",
  kpi_quota_full: "Limite atingido",

  code_label_ph: "Rótulo / Cliente (ex: Família Silva, Quarto 2)",
  code_lifetime_badge: "♾️ Sem limite de tempo (Vitalícia)",
  code_trial_badge: "🎁 Primeira chave: 3 dias Grátis",
  code_generate_btn: "Gerar Chave",
  code_lifetime_checkbox: "Gerar chave sem limite de tempo (Exclusivo Administrador Geral)",
  code_lifetime_hint: "Esta chave nunca expirará e não gera cobranças",
  code_trial_hint: "Chave padrão de teste de 3 dias (depois extensível para 30d, 90d ou 360d)",

  new_code_title: "Nova chave gerada com sucesso!",
  new_code_max_devices: "Máx. 3 dispositivos",
  new_code_desc: "Por motivos de segurança o código só é exibido neste momento. Copie-o ou compartilhe o link direto:",
  copy_code: "Copiar Código",
  copied_code: "✓ Código Copiado",
  copy_link: "🔗 Copiar Link Rápido",
  copied_link: "✓ Link Copiado",

  filter_all: "Todos",
  filter_active: "Ativos",
  filter_expiring: "A Vencer",
  filter_full: "Cheios 3/3",
  filter_expired: "Expirados",
  filter_admin_label: "Admin:",
  filter_all_admins: "Todos os admins",
  search_ph: "Buscar rótulo, ref ou admin...",

  no_label: "(Sem rótulo)",
  status_revoked: "Revogado",
  status_lifetime: "Vitalícia",
  status_expired: "Expirado",
  status_expires_in: (days) => `Vence em ${days}d`,
  status_expires_date: "Expira:",
  status_days_left: (days) => `(${days}d restantes)`,
  status_devices_badge: (count, max) => `📱 ${count}/${max} dispositivos`,
  status_last_seen: "Última conexão:",
  btn_release_slots: (max) => `Liberar vagas (0/${max})`,
  badge_permanent: "Permanente",
  btn_reactivate: "Reativar",
  btn_revoke: "Revogar",
  btn_delete: "Excluir",
  devices_linked_title: (count, max) => `Dispositivos vinculados (${count}/${max}):`,
  devices_none: "Nenhum dispositivo se conectou com este código ainda.",
  device_seen: "Visto:",
  confirm_reset_sessions: (label) => `Desvincular todos os dispositivos de "${label || "este código"}"?\nAs 3 vagas serão liberadas para novos dispositivos.`,
  confirm_delete_code: (label) => `Excluir código "${label}"?\nIsso também cancelará todas as sessões ativas.`,
  msg_slots_released: "Dispositivos desvinculados com sucesso. Vagas liberadas (0/3).",
  msg_extend_success: (days) => `Prazo estendido por +${days} dias com sucesso`,
  msg_extend_error: "Erro ao estender prazo",
  msg_gen_error: "Erro ao gerar chave",

  admins_title: "Gerenciamento de Administradores",
  admins_subtitle: "Conceda ou suspenda acessos ao servidor e supervisione as chaves de cada administrador.",
  btn_new_admin: "+ Novo Administrador",
  th_admin: "Administrador",
  th_role: "Função",
  th_active_codes: "Chaves Ativas",
  th_total_codes: "Total Chaves",
  th_devices: "Dispositivos",
  th_last_login: "Último Acesso",
  th_status: "Status",
  th_actions: "Ações",
  badge_you: "Você",
  btn_active: "● Ativo",
  btn_suspended: "○ Suspenso",
  btn_key_pass: "🔑 Senha",
  confirm_toggle_admin: (action, user, warning) => `Deseja ${action} a conta de @${user}?\n${warning}`,
  confirm_delete_admin: (user) => `Excluir administrador @${user}?\nEsta ação não pode ser desfeita.`,
  confirm_change_role: (user, role) => `Deseja mudar o papel de @${user} para "${role}"?`,
  role_promote_super: "Promover a Super Admin",
  role_demote_manager: "Mudar para Gerenciador",

  prov_new: "+ Novo Servidor",
  prov_diagnose: "Diagnosticar Servidores",
  prov_diagnosing: "Diagnosticando servidores...",
  prov_healthy: (ms) => `${ms}ms`,
  prov_slow: (ms) => `Lento (${ms}ms)`,
  prov_waf: (ms) => `WAF (${ms}ms)`,
  prov_down: "Fora",
  prov_inactive: "inativo",
  prov_activate: "Ativar",
  prov_deactivate: "Desativar",
  prov_edit: "Editar",
  prov_delete: "Excluir",
  prov_id_ph: "ID único (ex: megaembed)",
  prov_name_ph: "Nome público",
  prov_audio_langs: "Idiomas de Áudio Disponíveis:",
  prov_subs_langs: "Legendas Integradas (opcional):",
  prov_movie_tpl: "Modelo filme (…{id}…)",
  prov_tv_tpl: "Modelo série (…{id}…{s}…{e}…)",
  prov_entry_key: "Chave própria (opcional)",
  prov_beta_title: "🧪 Servidor em fase Beta (Experimental)",
  prov_beta_desc: "Servidores Beta nunca tocarão por padrão. Só carregam se o usuário clicar neles.",
  prov_save: "Salvar Servidor",
  prov_cancel: "Cancelar",

  live_new: "+ Nova Fonte Live",
  live_url_ph: "URL da lista",
  live_save: "Salvar",

  bill_title_super: "Controle de Vendas e Fechamento",
  bill_title_reseller: "Meu Extrato de Conta e Finanças",
  bill_sub_super: "Supervisão financeira de revendedores, tarifas por pacote, fechamentos e gestão de inadimplência.",
  bill_sub_reseller: "Auditoria de chaves geradas, saldo acumulado do ciclo atual e datas de corte.",
  bill_btn_refresh: "Atualizar",
  bill_btn_refreshing: "Atualizando...",
  bill_btn_close_period: "Executar Fechamento de Período",
  bill_btn_closing: "Fechando...",
  bill_kpi_open_cycle: "Vendas Ciclo Aberto",
  bill_kpi_open_cycle_sub: "Em andamento para próximo corte",
  bill_kpi_pending_debt: "Dívida Pendente",
  bill_kpi_pending_debt_sub: "Liquidações fechadas sem pagamento",
  bill_kpi_total_paid: "Total Recebido",
  bill_kpi_total_paid_sub: "Liquidações pagas com sucesso",
  bill_kpi_cuts: "Cortes por Inadimplência",
  bill_kpi_cuts_sub: "Períodos suspensos",
  bill_reseller_title: "Extrato de Conta Atual",
  bill_reseller_due_desc: "a pagar no próximo fechamento",
  bill_reseller_sold_summary: (codes, pkgs) => `Você vendeu/renovou ${codes} chaves (${pkgs} pacotes de 30d) neste ciclo.`,
  bill_rate_package_label: "Tarifa Pacote 30 Dias:",
  bill_frequency_label: "Frequência de fechamento:",
  bill_closing_day_label: "Dia de fechamento:",
  bill_weekly: "Semanal",
  bill_monthly: "Mensal",
  bill_day_names: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
  bill_day_prefix: "Dia",
  bill_settings_title: "Tarifas e Configuração de Fechamento",
  bill_settings_sub: "Defina o preço por pacote de 30 dias e o ciclo de corte programado para os revendedores.",
  bill_price_30d_label: "Preço Pacote 30 Dias ($ USD)",
  bill_margin_percent_label: "Margem de Ganho Revendedor (%)",
  bill_reseller_profit_label: "Ganho Revendedor",
  bill_real_due_label: "A Pagar (Valor Real)",
  bill_gross_sales_label: "Venda Bruta",
  bill_my_profit_label: "Seu Lucro Líquido",
  bill_margin_preview: (base, margin, profit, due) => `Por pacote de $${base} USD com ${margin}% de margem: o revendedor ganha $${profit} USD e deve te pagar $${due} USD.`,
  bill_cycle_label: "Ciclo de Fechamento",
  bill_btn_save_rate: "Salvar Tarifa",
  bill_btn_saving_rate: "Salvando...",
  bill_model_expl: (price) => `Modelo de Pacotes de 30 Dias: Todo o faturamento opera em múltiplos de 30 dias a $${price || "10.00"} USD / pacote. As extensões aplicam: 30d ($10), 90d ($30) e 360d ($120). A primeira chave de teste de 3 dias e chaves vitalícias não geram custo.`,
  bill_curr_balance_title: "Saldo Acumulado do Ciclo em Andamento (Aberto)",
  bill_curr_balance_sub: "Vendas e renovações registradas desde o último corte. Este valor será liquidado no próximo fechamento.",
  bill_curr_empty: "Nenhuma venda ou renovação registrada no período em andamento ainda.",
  bill_history_title_super: "Liquidações de Fechamento de Faturamento",
  bill_history_title_reseller: "Minhas Liquidações e Pagamentos",
  bill_history_sub_super: "Histórico de períodos fechados. Registre pagamentos ou suspenda/reative chaves em massa por inadimplência.",
  bill_history_sub_reseller: "Histórico de seus períodos liquidados pelo Administrador Geral e comprovantes.",
  bill_history_empty: "Nenhum fechamento executado ainda. As liquidações aparecerão aqui após o primeiro corte programado.",
  bill_status_suspended: "🛑 Suspenso por Inadimplência",
  bill_status_paid: "✓ Pago",
  bill_status_pending: "⏳ Pagamento Pendente",
  bill_btn_mark_paid: "✓ Marcar como Pago",
  bill_btn_suspend_codes: "🛑 Suspender Chaves",
  bill_btn_reactivate_paid: "🔄 Reativar e Registrar Pagamento",
  bill_tx_title_super: "Livro Contábil de Vendas Recentes",
  bill_tx_title_reseller: "Minhas Vendas e Renovações Recentes",
  bill_tx_empty: "Nenhuma transação registrada ainda.",
  bill_tx_create: "Criação",
  bill_tx_renew: "Renovação",
  bill_tx_extend: "Extensão",

  modal_suspend_title: "Suspender chaves por falta de pagamento?",
  modal_suspend_desc: (admin, amount) => `Você está prestes a suspender em massa as chaves geradas ou renovadas pelo administrador @${admin} referentes a esta liquidação ($${amount} USD).`,
  modal_suspend_warning_title: "⚠️ Consequências imediatas:",
  modal_suspend_li1: "As chaves do período serão revogadas imediatamente no sistema.",
  modal_suspend_li2: "Todas as sessões ativas nos dispositivos serão desconectadas.",
  modal_suspend_li3: "Os clientes verão a tela de bloqueio e não poderão reproduzir.",
  modal_suspend_confirm: "Sim, Desativar Chaves Agora",
  modal_suspend_processing: "Desativando chaves...",
  modal_reactivate_title: "Reativar chaves e registrar pagamento",
  modal_reactivate_desc: (admin, amount) => `O administrador @${admin} realizou o pagamento de $${amount} USD.`,
  modal_reactivate_auto_title: "✓ Ações automáticas:",
  modal_reactivate_li1: "As chaves suspensas que ainda estiverem dentro do prazo serão reativadas.",
  modal_reactivate_li2: "A liquidação será arquivada com o status de Pago.",
  modal_reactivate_li3: "Os clientes voltarão a ter acesso sem precisar de chaves novas.",
  modal_reactivate_confirm: "Reativar e Marcar Pago",
  modal_reactivate_processing: "Reativando...",
  modal_new_admin_title: "Novo Administrador",
  modal_admin_name: "Nome ou Apelido (Identificador)",
  modal_admin_name_ph: "ex: Carlos - Vendas Norte",
  modal_admin_user: "Nome de Usuário (Login)",
  modal_admin_user_hint: "Apenas minúsculas, números, hífens e sublinhados.",
  modal_admin_pass: "Senha Inicial",
  modal_admin_pass_ph: "Mínimo 6 caracteres",
  modal_admin_role: "Função e Permissões",
  modal_role_admin: "Gerenciador de Chaves (Gerencia apenas suas próprias chaves)",
  modal_role_super: "Super Administrador (Controle total do servidor)",
  modal_btn_create_admin: "Criar Administrador",
  modal_change_pass_title: (u) => `Alterar Senha: @${u}`,
  modal_new_pass: "Nova Senha",
  modal_new_pass_hint: "Ao alterar a senha, as sessões ativas deste administrador serão encerradas automaticamente.",
  modal_btn_update_pass: "Atualizar Senha",
  cancel: "Cancelar",
};

const STR: Record<Lang, AdminDict> = { es, en, pt };

export function getAdminDict(lang: Lang): AdminDict {
  return STR[lang] || es;
}
