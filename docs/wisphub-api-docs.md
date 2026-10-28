# Documentación Oficial de la API de WispHub (v1.2.0)

Esta documentación reúne todos los endpoints disponibles de la API REST de WispHub para su consulta rápida en el proyecto.

## URIs Base
- **Pruebas (Sandbox):** `https://sandbox-api.wisphub.net/api/`
- **Producción:** `https://api.wisphub.io/api/` (o `https://api.wisphub.net/api/`)

## Autenticación
Todas las peticiones deben incluir la cabecera:
```http
Authorization: Api-Key <TU_API_KEY>
Content-Type: application/json
```

---

## 1. Finanzas - Facturas y Pagos

### Listar Facturas
- **Método:** `GET`
- **Ruta:** `/facturas/`
- **Parámetros de búsqueda / filtro:**
  - `cliente`: Nombre de usuario (`usuario@empresa`).
  - `estado`: `1` = Pendiente de Pago, `2` = Pagada, `3` = Cancelada, `4` = En Revisión, `5` = Se Transfirió.
  - `tipo`: `1` = Internet, `2` = Otros Ingresos.
  - `fecha_emision__range_0` / `fecha_emision__range_1`: Rango `YYYY-MM-DD`.
  - `fecha_vencimiento__range_0` / `fecha_vencimiento__range_1`: Rango `YYYY-MM-DD`.
  - `fecha_pago__range_0` / `fecha_pago__range_1`: Rango `YYYY-MM-DD`.
  - `cajero`: ID del cajero.
  - `zona`: ID de la zona.
  - `limit`: Límite de resultados (ej. `300`).
  - `offset`: Desplazamiento de paginación.

### Consultar Información de una Factura
- **Método:** `GET`
- **Ruta:** `/facturas/{id_factura}/`

### Registrar Pago a una Factura (OFICIAL)
- **Método:** `POST`
- **Ruta:** `/facturas/{id_factura}/registrar-pago/`
- **Permiso necesario en WispHub:** `Registrar Pagos`
- **Cuerpo JSON:**
```json
{
  "referencia": "CARD_715_1793143134859",
  "fecha_pago": "2026-10-27 17:18",
  "total_cobrado": 250.00,
  "accion": 1,
  "forma_pago": 21899
}
```
* **Campos:**
  - `referencia` *(string)*: Folio o referencia de pago de OpenPay o banco.
  - `fecha_pago` *(string YYYY-MM-DD HH:mm)*: Fecha y hora del pago.
  - `total_cobrado` *(number)*: Monto total pagado.
  - `accion` *(number)*:
    - `0`: Solo registrar pago.
    - `1`: Registrar pago y activar el servicio automáticamente en el RB/Mikrotik.
  - `forma_pago` *(integer)*: ID de la forma de pago (consultar en `/formas-de-pago/`, ej. `21899` para Transferencia o `21898` para Efectivo).

### Reportar Pago de Factura (Alternativo / Portal Cliente)
- **Método:** `POST`
- **Ruta:** `/facturas/reportar-pago/{id_factura}/`
- **Cuerpo JSON:**
```json
{
  "referencia": "string",
  "fecha_pago": "YYYY-MM-DD HH:mm",
  "nombre_user": "string",
  "forma_pago": 21899,
  "comprobante_pago": "string"
}
```

### Listado de Formas de Pago
- **Método:** `GET`
- **Ruta:** `/formas-de-pago/`
- *IDs registrados en la empresa:*
  - `21899`: Transferencia Bancaria
  - `21898`: Efectivo
  - `38087`: CoDi
  - `25393`: Saldo a Favor

---

## 2. Clientes y Servicios

### Listar Clientes
- **Método:** `GET`
- **Ruta:** `/clientes/`
- **Filtros útiles:**
  - `id_servicio`: ID único del servicio.
  - `usuario`: Usuario exacto (`0696-maria-pilar-perez-mendoza@cloud-ware-mx`).
  - `usuario__contains`: Búsqueda parcial.
  - `telefono` / `telefono__contains`: Teléfono del cliente.
  - `ip`: IP asignada al cliente.
  - `estado`: `1` = Activo, `2` = Suspendido, `3` = Cancelado, `4` = Gratis.

### Consultar Cliente por Servicio
- **Método:** `GET`
- **Ruta:** `/clientes/{id_servicio}/`

### Consultar Saldo del Cliente
- **Método:** `GET`
- **Ruta:** `/clientes/{id_servicio}/saldo/`

### Activar / Desactivar Servicio de Cliente
- **Método:** `POST`
- **Ruta:** `/clientes/{accion}/`  (donde `{accion}` es `activar` o `desactivar`)
- **Cuerpo JSON:**
```json
{
  "servicios": [715]
}
```

### Consultar Perfil e Información Adicional
- **Método:** `GET`
- **Ruta:** `/clientes/{id_servicio}/perfil/`

### Editar Información Adicional del Cliente
- **Método:** `PUT`
- **Ruta:** `/clientes/{id_servicio}/perfil/`

---

## 3. Soporte Técnico (Tickets)

### Listar Tickets
- **Método:** `GET`
- **Ruta:** `/tickets/`

### Crear Ticket
- **Método:** `POST`
- **Ruta:** `/tickets/`
- **Campos principales:**
  - `servicio`: ID del cliente / servicio.
  - `asunto` / `asuntos_default`: Motivo del reporte (ej: "Internet Lento", "No Tiene Internet").
  - `descripcion`: Detalle del problema.
  - `prioridad`: `1` (Baja), `2` (Normal), `3` (Alta), `4` (Muy Alta).
  - `estado`: `1` (Nuevo), `2` (En Progreso), `3` (Resuelto), `4` (Cerrado).
  - `departamento`: "Soporte Técnico".

---

## 4. Planes de Internet y Sistema

- **Planes de Internet:** `GET /plan-internet/`
- **Zonas:** `GET /zonas/`
- **Routers Wifi:** `GET /router/`
- **Staff / Personal:** `GET /staff/`
