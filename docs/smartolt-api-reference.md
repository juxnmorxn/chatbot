# SmartOLT API Reference (Actualizada Octubre 2026)

Documentación completa y referencia técnica de la API REST, Webhooks y Real-Time Server-Sent Events (SSE) de SmartOLT para gestión de OLTs, ONUs, Wi-Fi, puertos, señales y aprovisionamiento.

URL base: `https://<your-subdomain>.smartolt.com/api/`  
Autenticación: Encabezado HTTP `X-Token: <api_key>`  
Especificación OpenAPI machine-readable: `https://www.smartolt.com/openapi.json`

---

## 1. Novedades y Cambios Clave (Octubre 2026)

- 🆕 **Eventos en Tiempo Real (Real-time events)**: Notificación de cambios de estado de ONU, señales, autorizaciones y caídas de PON vía Webhook o SSE (`/api/onu/get_event_stream`). Elimina la necesidad de polling constante.
- ⚡ **Llamadas Asíncronas (`async=1`)**: Para acciones de alto volumen (habilitar/deshabilitar ONUs, CATV, perfiles de velocidad). Responde inmediatamente sin bloquear el hilo ni esperar a la OLT.
- 📦 **Acciones en Lote (Bulk Actions)**: Hasta 10,000 ONUs por solicitud con `async=1` (o hasta 50 sin `async=1`).
- 🆕 **Historial de Estado ONU**: Consulta de disponibilidad (Online, LOS, Power fail, Offline) por hasta 365 días.
- 🆕 **Direcciones MAC**: Búsqueda de MACs activas detrás de una ONU o localización de ONU por MAC.

---

## 2. Límites y Cuotas de la API (Rate Limits)

- **Presupuesto Estándar**: 1,000 llamadas API por hora.
- **Presupuesto Asíncrono**: 5,000 llamadas por hora (separado del presupuesto estándar).
- **Límite de Ráfaga**: Máximo 15 llamadas por segundo. Superarlo bloquea las peticiones por 10 segundos con código HTTP 429 (`rate_limit_exceeded`).
- **Cabeceras de Control**:
  - `X-RateLimit-Limit`: Límite asignado.
  - `X-RateLimit-Remaining`: Peticiones restantes.
  - `X-RateLimit-Reset`: Segundos restantes para el reinicio de la ventana.

---

## 3. Catálogo Completo de Endpoints

### 3.1 Sistema y OLTs
- `GET /api/system/get_olts`: Lista de OLTs (IDs, nombres, IPs, versiones de hardware, puertos Telnet y SNMP).
- `GET /api/olt/get_olts_uptime_and_env_temperature`: Uptime y temperatura ambiente de las OLTs.
- `GET /api/olt/get_olt_cards_details`: Detalle de tarjetas de la OLT.
- `GET /api/olt/get_olt_pon_ports_details`: Detalle de puertos PON de la OLT.
- `GET /api/olt/get_olt_outage_pons_details`: Puertos PON caídos o en falla.
- `GET /api/olt/get_olt_uplink_ports_details`: Detalle de puertos Uplink de la OLT.
- `POST /api/olt/save_olts_config`: Guarda la configuración activa en memoria de la OLT.

### 3.2 Tipos de ONU, Zonas y Splitters
- `GET /api/onu/get_onu_types`: Lista completa de modelos y tipos de ONU soportados.
- `GET /api/onu/get_onu_types_by_pon_type`: Tipos de ONU filtrados por tecnología PON (GPON, EPON, XGS-PON).
- `GET /api/onu/get_onu_type_image`: Imagen del modelo de ONU.
- `POST /api/onu/add_onu_type`: Registrar un nuevo modelo de ONU.
- `GET /api/zone/get_zones`: Listar zonas geográficas o de red.
- `POST /api/zone/add_zone`: Crear una nueva zona.
- `GET /api/splitter/get_splitters`: Listar splitters registrados.
- `POST /api/splitter/add_splitter`: Añadir un splitter.
- `POST /api/splitter/edit_splitter/{unique_external_id}`: Editar splitter.
- `POST /api/splitter/delete_splitter/{unique_external_id}`: Eliminar splitter.

### 3.3 Perfiles de Velocidad y VLANs
- `GET /api/speed_profile/get_speed_profiles`: Lista de perfiles de velocidad (Download / Upload).
- `GET /api/vlan/get_vlans`: Lista de VLANs disponibles.
- `POST /api/vlan/add_vlan`: Crear una nueva VLAN.

### 3.4 Consultas de Estado y Señales Ópticas de ONUs
- `GET /api/onu/get_all_unconfigured_onus`: ONUs detectadas sin autorizar en todas las OLTs.
- `GET /api/onu/get_unconfigured_onus_by_olt/{olt_id}`: ONUs sin autorizar en una OLT específica.
- `GET /api/onu/get_all_onus_statuses`: Estado de todas las ONUs (Online, LOS, Power fail, Offline).
- `GET /api/onu/get_all_onus_signals`: Niveles de señal óptica de todas las ONUs.
- `GET /api/onu/get_all_onus_details`: Datos generales de todas las ONUs.
- `GET /api/onu/get_all_onus_gps_coordinates`: Coordenadas GPS de todas las ONUs registradas.
- `GET /api/onu/get_onu_status/{unique_external_id}`: Estado actual de una ONU.
- `GET /api/onu/get_onu_status_history/{unique_external_id}`: Historial de estado (uptime, caídas, LOS) por hasta 365 días.
- `GET /api/onu/get_onu_signal/{unique_external_id}`: Potencia óptica en vivo (Rx OLT 1310 nm y Rx ONU 1490 nm).
- `GET /api/onu/get_onu_details/{unique_external_id}`: Ficha técnica completa de la ONU (puertos LAN, Wi-Fi, VLAN, modo, IP, etc.).
- `GET /api/onu/get_onus_details_by_sn/{sn}`: Buscar ONU por número de serie (ej. HWTC..., ZTEG...).
- `GET /api/onu/get_onu_full_status_info/{unique_external_id}`: Estado extendido incluyendo interfaces activas.
- `GET /api/onu/get_onu_running_config/{unique_external_id}`: Configuración en ejecución exportada desde la OLT.
- `GET /api/onu/get_onu_signal_graph/{unique_external_id}`: Datos para graficar potencia óptica histórica.
- `GET /api/onu/get_onu_traffic_graph/{unique_external_id}`: Gráfica de tráfico de subida y bajada.
- `GET /api/onu/get_onu_speed_profiles/{unique_external_id}`: Perfiles de velocidad asignados a la ONU.
- `GET /api/onu/get_onu_router_hosts/{unique_external_id}`: Hosts / dispositivos conectados reportados por el router.
- `GET /api/onu/get_onu_mac_addresses/{unique_external_id}`: Direcciones MAC conectadas en los puertos de la ONU.
- `GET /api/onu/search_onu_by_mac/{mac_address}`: Localizar la ONU correspondiente a una dirección MAC específica.

### 3.5 Aprovisionamiento y Autorización de ONUs
- `GET /api/onu/get_all_onu_authorization_presets`: Presets de autorización configurados.
- `GET /api/onu/get_all_onu_authorization_presets_applicable_to_sn/{sn}`: Presets compatibles con un modelo/SN.
- `POST /api/onu/authorize_onu_using_preset`: Autorizar ONU automáticamente aplicando un preset.
- `POST /api/onu/authorize_onu`: Autorización manual con parámetros detallados (OLT, puerto PON, modo, VLAN, IP, perfil de velocidad).
- `POST /api/onu/move_onu/{unique_external_id}`: Mover ONU de puerto PON o tarjeta en la OLT.
- `POST /api/onu/update_onu_pon_channel/{unique_external_id}`: Cambiar canal PON.
- `POST /api/onu/update_onu_sn_mac/{unique_external_id}`: Reemplazar SN o MAC (Swap de módem).
- `POST /api/onu/update_onu_type/{unique_external_id}`: Cambiar modelo/tipo de ONU.
- `POST /api/onu/update_onu_custom_profile/{unique_external_id}`: Modificar perfil personalizado.
- `POST /api/onu/delete_onu/{unique_external_id}`: Eliminar ONU de SmartOLT y desaprovisionar de la OLT.

### 3.6 Presets de Configuración y Tareas Asíncronas (Bulk)
- `GET /api/onu/get_onu_configuration_presets`: Listar presets de configuración.
- `POST /api/onu/apply_configuration_preset/{unique_external_id}`: Aplicar preset a una ONU.
- `POST /api/onu/remove_configuration_preset/{unique_external_id}`: Remover preset de una ONU.
- `POST /api/onu/bulk_apply_configuration_preset`: Aplicar preset a hasta 10,000 ONUs de forma asíncrona (`async=1`).
- `POST /api/onu/bulk_remove_configuration_preset`: Remover preset en masa de forma asíncrona.
- `POST /api/system/check_bulk_task_status`: Consultar progreso y resultado de una tarea masiva asíncrona.

### 3.7 Parámetros de Red, VLANs y Modos de Operación
- `POST /api/onu/update_onu_location_details/{unique_external_id}`: Actualizar dirección física, zona y contacto.
- `POST /api/onu/update_onu_unique_external_id/{unique_external_id}`: Modificar el identificador externo único.
- `POST /api/onu/update_onu_attached_vlans/{unique_external_id}`: Modificar VLANs adicionales asociadas.
- `POST /api/onu/update_onu_main_vlan/{unique_external_id}`: Cambiar la VLAN principal de servicio.
- `POST /api/onu/set_onu_mode/{unique_external_id}`: Modo de operación (Routing / Bridge).
- `POST /api/onu/set_onu_mgmt_ip_mode_inactive/{unique_external_id}`: Desactivar IP de administración.
- `POST /api/onu/set_onu_mgmt_ip_mode_static/{unique_external_id}`: Configurar IP estática de administración.
- `POST /api/onu/set_onu_mgmt_ip_mode_dhcp/{unique_external_id}`: Configurar IP por DHCP para administración.
- `POST /api/onu/enable_onu_tr069/{unique_external_id}`: Habilitar protocolo TR-069.
- `POST /api/onu/disable_onu_tr069/{unique_external_id}`: Deshabilitar protocolo TR-069.

### 3.8 Configuración WAN
- `POST /api/onu/set_onu_wan_mode_webpage/{unique_external_id}`: Configuración WAN delegada a la interfaz web del módem.
- `POST /api/onu/set_onu_wan_mode_dhcp/{unique_external_id}`: WAN por DHCP.
- `POST /api/onu/set_onu_wan_mode_static/{unique_external_id}`: WAN con IP Estática.
- `POST /api/onu/set_onu_wan_mode_pppoe/{unique_external_id}`: WAN por cliente PPPoE (usuario y clave).
- `POST /api/onu/set_onu_wan_configuration_method/{unique_external_id}`: Método de provisión WAN (OMCI o TR-069).
- `POST /api/onu/set_onu_wan_ip_version/{unique_external_id}`: Versión de IP en WAN (IPv4, IPv6 o Dual Stack).
- `POST /api/onu/enable_onu_allow_remote_access_to_wan_ip/{unique_external_id}`: Habilitar acceso remoto web en la IP WAN.
- `POST /api/onu/disable_onu_allow_remote_access_to_wan_ip/{unique_external_id}`: Deshabilitar acceso remoto WAN.

### 3.9 Puertos Ethernet, Seguridad y CATV
- `POST /api/onu/update_onu_speed_profiles/{unique_external_id}`: Actualizar ancho de banda (Down/Up) en tiempo real.
- `POST /api/onu/bulk_update_speed_profiles`: Actualización masiva de velocidades con `async=1`.
- `POST /api/onu/set_onu_ethernet_port_mode_lan/{unique_external_id}`: Puerto LAN en modo estándar.
- `POST /api/onu/set_onu_ethernet_port_mode_iptv/{unique_external_id}`: Puerto LAN dedicado a decodificador IPTV.
- `POST /api/onu/set_onu_ethernet_port_mode_access/{unique_external_id}`: Puerto LAN modo Access con VLAN asignada.
- `POST /api/onu/set_onu_ethernet_port_mode_trunk/{unique_external_id}`: Puerto LAN modo Trunk.
- `POST /api/onu/shutdown_onu_ethernet_port/{unique_external_id}`: Apagar administrativamente puerto Ethernet.
- `POST /api/onu/enable_onu_catv/{unique_external_id}`: Habilitar puerto de televisión por cable (CATV).
- `POST /api/onu/disable_onu_catv/{unique_external_id}`: Deshabilitar puerto CATV.

### 3.10 Gestión Wi-Fi (SSID, Clave, Bandas)
- `POST /api/onu/set_wifi_port_transparent/{unique_external_id}`:
  Configura SSID y Contraseña de los puertos Wi-Fi (WLAN 2.4 GHz y 5 GHz):
  - Parámetros:
    - `wifi_port`: `wifi_0/1` (para 2.4 GHz) o `wifi_0/5` (para 5 GHz).
    - `ssid`: Nombre de la red Wi-Fi.
    - `password`: Clave de seguridad (mínimo 8 caracteres).
    - `authentication_mode`: `WPA2` o `WPA/WPA2`.
- `POST /api/onu/set_onu_wifi_port_mode_lan/{unique_external_id}`: Puerto Wi-Fi en modo LAN estándar.
- `POST /api/onu/shutdown_onu_wifi_port/{unique_external_id}`: Desactivar radio Wi-Fi.
- `POST /api/onu/change_onu_web_user_password/{unique_external_id}`: Cambiar credenciales de acceso a la interfaz web del módem.

### 3.11 Diagnóstico y Mantenimiento
- `POST /api/onu/reboot_onu/{unique_external_id}`: Reinicio en frío de la ONU vía comando OLT/OMCI.
- `POST /api/onu/resync_onu_config/{unique_external_id}`: Resincronizar parámetros de configuración de la OLT hacia la ONU.
- `POST /api/onu/restore_onu_factory_defaults/{unique_external_id}`: Resetear la ONU a valores de fábrica.
- `POST /api/onu/disable_onu/{unique_external_id}`: Bloqueo administrativo por suspensión de servicio.
- `POST /api/onu/enable_onu/{unique_external_id}`: Reactivación administrativa de servicio.
- `POST /api/onu/bulk_enable`: Reactivación masiva con `async=1`.
- `POST /api/onu/bulk_disable`: Suspensión masiva con `async=1`.

---

## 4. Eventos en Tiempo Real (SSE y Webhooks)

### Server-Sent Events (SSE)
- Endpoint: `GET /api/onu/get_event_stream?events=onu.status_changed,onu.unconfigured_detected,onu.signal_reading`
- Devuelve URL con token temporal válida por 15 minutos (`expires_in: 900`).
- Soporta cabecera `Last-Event-ID` para reanudar eventos perdidos si la conexión se interrumpe.

### Webhook Automático
- SmartOLT envía eventos en formato JSON vía HTTPS POST con firma `webhook-signature` (algoritmo HMAC-SHA256 con estándar Standard Webhooks).
- Tipos de eventos:
  - `onu.status_changed`: Cambios de estado en vivo (Online, LOS, Power fail, Offline).
  - `onu.signal_reading`: Nuevas lecturas de potencia óptica.
  - `onu.authorized` / `onu.deleted` / `onu.updated`: Gestión de inventario.
  - `pon.outage_started` / `pon.outage_ended`: Cortes masivos en puerto PON.
