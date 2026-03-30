# @mantissaio/medusa-payment-wompi

**[Read in English](./README.md)**

Recibe pagos en tu aplicacion de comercio digital con Medusa usando [Wompi El Salvador](https://wompi.sv).

[Medusa Website](https://medusajs.com/) | [Wompi Docs](https://docs.wompi.sv/) | [Wompi API](https://api.wompi.sv/index.html)

> [!NOTE]
> Este plugin soporta el flujo de **Enlace de Pago** (pagina de pago hosted por Wompi). La tokenizacion (`savePaymentMethod`) y los pagos recurrentes aun no estan soportados. El WompiClient incluye los metodos para estos endpoints, listos para conectarse al provider en una futura version.

## Caracteristicas

- Pago via pagina hosted de Wompi (Enlace de Pago)
- Todos los metodos de pago soportados: tarjeta credito/debito, Puntos Agricola, cuotas, Bitcoin, QuickPay
- Validacion de webhooks via HMAC-SHA256
- Auto-captura (Wompi captura al momento del pago)
- Enlaces de pago de un solo uso

---

## Requisitos previos

- [Node.js v20+](https://nodejs.org/en)
- [Un backend Medusa v2](https://docs.medusajs.com/learn/installation)
- Una [cuenta Wompi](https://wompi.sv) con al menos un negocio configurado
- Para pruebas locales, exponer localhost via [ngrok](https://ngrok.com/) o similar

### Credenciales de Wompi

Desde el [Panel de Wompi](https://panel.wompi.sv), navega al detalle de tu negocio para encontrar:

- **App ID** → se usa como `WOMPI_CLIENT_ID`
- **API Secret** → se usa como `WOMPI_CLIENT_SECRET` y `WOMPI_API_SECRET`

---

## Instalacion

```bash
# npm
npm install @mantissaio/medusa-payment-wompi

# pnpm
pnpm add @mantissaio/medusa-payment-wompi

# yarn
yarn add @mantissaio/medusa-payment-wompi
```

## Configuracion

### Variables de entorno

```env
WOMPI_CLIENT_ID=<tu_app_id>
WOMPI_CLIENT_SECRET=<tu_api_secret>
WOMPI_API_SECRET=<tu_api_secret>
```

### Configuracion de Medusa

En tu `medusa-config.ts`:

```ts
module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@mantissaio/medusa-payment-wompi/providers/wompi",
            id: "wompi",
            options: {
              clientId: process.env.WOMPI_CLIENT_ID,
              clientSecret: process.env.WOMPI_CLIENT_SECRET,
              apiSecret: process.env.WOMPI_API_SECRET,
              sandbox: true,
              defaultRedirectUrl: "https://tu-tienda.com/checkout/confirmar",
              defaultWebhookUrl: "https://tu-tienda.com/hooks/payment/wompi_wompi",
            },
          },
        ],
      },
    },
  ],
});
```

### Opciones

| Opcion | Requerida | Descripcion |
|---|---|---|
| `clientId` | Si | App ID del panel de Wompi |
| `clientSecret` | Si | API Secret para autenticacion OAuth |
| `apiSecret` | Si | API Secret para validacion HMAC de webhooks |
| `sandbox` | No | `true` para modo desarrollo (default: `true`) |
| `defaultRedirectUrl` | No | URL a donde se redirige al cliente despues del pago |
| `defaultWebhookUrl` | No | URL del webhook para notificaciones de pago |
| `defaultFormaPago` | No | Sobreescribe cuales metodos de pago estan habilitados en la pagina de pago |

---

## Configuracion de Webhooks

Medusa expone automaticamente un endpoint de webhook en:

```
/hooks/payment/wompi_wompi
```

Para desarrollo local:

1. Ejecuta tu backend de Medusa: `pnpm dev`
2. En otra terminal: `ngrok http 9000`
3. Configura `defaultWebhookUrl` como `https://<url-ngrok>/hooks/payment/wompi_wompi`

Wompi envia un header `wompi_hash` (HMAC-SHA256 del body usando tu API Secret) que el plugin valida automaticamente.

---

## Flujo de pago

1. El cliente inicia el checkout → Medusa llama `initiatePayment()` → el plugin crea un Enlace de Pago en Wompi
2. El storefront llama `POST /store/wompi/payment-link` con `{ paymentSessionId }` → recibe `{ urlEnlace }`
3. El storefront redirige al cliente a `urlEnlace` → el cliente paga en la pagina hosted de Wompi
4. Wompi envia webhook a `/hooks/payment/wompi_wompi` → el plugin valida HMAC y confirma el pago
5. Wompi redirige al cliente a `defaultRedirectUrl` → el storefront muestra la confirmacion del pedido

### API del Store

**POST** `/store/wompi/payment-link`

Request:
```json
{ "paymentSessionId": "ps_01ABC..." }
```

Response:
```json
{
  "urlEnlace": "https://lk.wompi.sv/abc123",
  "idEnlace": 12345,
  "urlQrCodeEnlace": "https://wompistorage.blob.core.windows.net/...",
  "urlEnlaceLargo": "https://wompi.sv/pago/..."
}
```

---

## Reembolsos

Wompi no expone un API de reembolsos. Cuando se emite un reembolso desde el admin de Medusa, el plugin lo registra en Medusa para trazabilidad (con estado `pending_manual`) pero la devolucion real de fondos debe procesarse manualmente a traves del [Panel de Wompi](https://panel.wompi.sv) o directamente con Banco Agricola.

---

## Probar el plugin

1. Ejecuta tu backend de Medusa: `pnpm dev`
2. Habilita Wompi en una region via el [dashboard admin](https://docs.medusajs.com/resources/references/payment/provider#5-test-it-out) o el Admin API
3. Asegurate que tu negocio esta en **modo desarrollo** en el panel de Wompi (las transacciones no seran reales)
4. Para simular un pago rechazado en modo desarrollo, usa CVV `111`

---

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar tests
pnpm test

# Compilar
pnpm build

# Modo dev (watch)
pnpm dev
```

### Pruebas locales con un proyecto Medusa

```bash
# Desde el directorio de tu proyecto Medusa
pnpm add ../ruta-al/medusa-payment-wompi
```

---

## Recursos adicionales

- [Documentacion API de Wompi](https://docs.wompi.sv/)
- [Swagger de Wompi](https://api.wompi.sv/index.html)
- [Panel de Wompi](https://panel.wompi.sv)
- [Docs del Modulo de Pagos de Medusa](https://docs.medusajs.com/resources/commerce-modules/payment)
