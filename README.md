# @mantissaio/medusa-payment-wompi

**[Leer en Español](./README.es.md)**

Receive payments on your Medusa commerce application using [Wompi El Salvador](https://wompi.sv).

[Medusa Website](https://medusajs.com/) | [Wompi Docs](https://docs.wompi.sv/) | [Wompi API](https://api.wompi.sv/index.html)

> [!NOTE]
> This plugin supports the **Enlace de Pago** (hosted payment page) flow. Tokenization (`savePaymentMethod`) and recurring payments are not yet supported. The WompiClient includes methods for these endpoints, ready to be wired into the provider in a future release.

## Features

- Payment via Wompi hosted payment page (Enlace de Pago)
- All payment methods supported: credit/debit card, Puntos Agricola, cuotas, Bitcoin, QuickPay
- Webhook validation via HMAC-SHA256
- Auto-capture (Wompi captures at the moment of payment)
- Single-use payment links (one successful payment per link)

---

## Prerequisites

- [Node.js v20+](https://nodejs.org/en)
- [A Medusa v2 backend](https://docs.medusajs.com/learn/installation)
- A [Wompi account](https://wompi.sv) with at least one business (negocio) configured
- For local testing, expose localhost via [ngrok](https://ngrok.com/) or similar

### Wompi credentials

From the [Wompi Panel](https://panel.wompi.sv), navigate to your business detail to find:

- **App ID** → used as `WOMPI_CLIENT_ID`
- **API Secret** → used as `WOMPI_CLIENT_SECRET` and `WOMPI_API_SECRET`

---

## Installation

```bash
# npm
npm install @mantissaio/medusa-payment-wompi

# pnpm
pnpm add @mantissaio/medusa-payment-wompi

# yarn
yarn add @mantissaio/medusa-payment-wompi
```

## Configuration

### Environment Variables

```env
WOMPI_CLIENT_ID=<your_app_id>
WOMPI_CLIENT_SECRET=<your_api_secret>
WOMPI_API_SECRET=<your_api_secret>
```

### Medusa Configuration

In your `medusa-config.ts`:

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
              defaultRedirectUrl: "https://your-store.com/checkout/confirm",
              defaultWebhookUrl: "https://your-store.com/hooks/payment/wompi_wompi",
            },
          },
        ],
      },
    },
  ],
});
```

### Options

| Option | Required | Description |
|---|---|---|
| `clientId` | Yes | App ID from Wompi panel |
| `clientSecret` | Yes | API Secret for OAuth authentication |
| `apiSecret` | Yes | API Secret for webhook HMAC validation |
| `sandbox` | No | `true` for development mode (default: `true`) |
| `defaultRedirectUrl` | No | URL where the customer is redirected after payment |
| `defaultWebhookUrl` | No | Webhook URL for payment notifications |
| `defaultFormaPago` | No | Override which payment methods are enabled on the payment page |

---

## Webhook Setup

Medusa automatically exposes a webhook endpoint at:

```
/hooks/payment/wompi_wompi
```

For local development:

1. Run your Medusa backend: `pnpm dev`
2. In a separate terminal: `ngrok http 9000`
3. Set `defaultWebhookUrl` to `https://<ngrok-url>/hooks/payment/wompi_wompi`

Wompi sends a `wompi_hash` header (HMAC-SHA256 of the body using your API Secret) which the plugin validates automatically.

---

## Payment Flow

1. Customer initiates checkout → Medusa calls `initiatePayment()` → plugin creates an Enlace de Pago in Wompi
2. Storefront calls `POST /store/wompi/payment-link` with `{ paymentSessionId }` → receives `{ urlEnlace }` 
3. Storefront redirects customer to `urlEnlace` → customer pays on Wompi's hosted page
4. Wompi sends webhook to `/hooks/payment/wompi_wompi` → plugin validates HMAC and confirms payment
5. Wompi redirects customer to `defaultRedirectUrl` → storefront shows order confirmation

### Store API

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

## Refunds

Wompi does not expose a refund API. When a refund is issued from the Medusa admin, the plugin records it in Medusa for traceability (with status `pending_manual`) but the actual fund return must be processed manually through the [Wompi Panel](https://panel.wompi.sv) or directly with Banco Agricola.

---

## Test the Plugin

1. Run your Medusa backend: `pnpm dev`
2. Enable Wompi in a region via the [admin dashboard](https://docs.medusajs.com/resources/references/payment/provider#5-test-it-out) or Admin API
3. Make sure your business is in **development mode** in the Wompi panel (transactions won't be real)
4. To simulate a rejected payment in development mode, use CVV `111`

---

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Dev mode (watch)
pnpm dev
```

### Local testing with a Medusa project

```bash
# From your Medusa project directory
pnpm add ../path-to/medusa-payment-wompi
```

---

## Additional Resources

- [Wompi API Documentation](https://docs.wompi.sv/)
- [Wompi Swagger](https://api.wompi.sv/index.html)
- [Wompi Panel](https://panel.wompi.sv)
- [Medusa Payment Module Docs](https://docs.medusajs.com/resources/commerce-modules/payment)
