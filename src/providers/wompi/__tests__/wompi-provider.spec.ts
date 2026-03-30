import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import WompiProviderService from "../service";
import { createHmac } from "crypto";

const mockClient = () => ({
  createPaymentLink: jest.fn(),
  getPaymentLink: jest.fn(),
  updatePaymentLink: jest.fn(),
  deactivatePaymentLink: jest.fn(),
  activatePaymentLink: jest.fn(),
  getTransaction: jest.fn(),
  tokenizeCard: jest.fn(),
  getTokenizedCards: jest.fn(),
  deleteTokenizedCard: jest.fn(),
  createRecurringLink: jest.fn(),
  getRecurringLink: jest.fn(),
  updateRecurringLink: jest.fn(),
  deactivateRecurringLink: jest.fn(),
  getBusinessInfo: jest.fn(),
});

const buildService = () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;
  const container = { logger };
  const options = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    apiSecret: "test-api-secret",
    sandbox: true,
    defaultWebhookUrl: "https://example.com/hooks/payment/wompi_wompi",
    defaultRedirectUrl: "https://example.com/checkout/confirm",
  };

  const service = new WompiProviderService(container, options);
  const client = mockClient();
  (service as any).client_ = client;

  return { service, client, logger, options };
};

describe("WompiProviderService", () => {
  beforeEach(() => jest.resetAllMocks());
  afterEach(() => jest.useRealTimers());

  describe("validateOptions", () => {
    it("throws when clientId is missing", () => {
      expect(() => WompiProviderService.validateOptions({ clientSecret: "x", apiSecret: "x" })).toThrow(
        "clientId"
      );
    });

    it("throws when clientSecret is missing", () => {
      expect(() => WompiProviderService.validateOptions({ clientId: "x", apiSecret: "x" })).toThrow(
        "clientSecret"
      );
    });

    it("throws when apiSecret is missing", () => {
      expect(() => WompiProviderService.validateOptions({ clientId: "x", clientSecret: "x" })).toThrow(
        "apiSecret"
      );
    });

    it("passes with valid options", () => {
      expect(() =>
        WompiProviderService.validateOptions({ clientId: "x", clientSecret: "y", apiSecret: "z" })
      ).not.toThrow();
    });
  });

  describe("initiatePayment", () => {
    it("creates a payment link and returns the enlace data", async () => {
      const { service, client } = buildService();

      client.createPaymentLink.mockResolvedValueOnce({
        idEnlace: 123,
        urlEnlace: "https://lk.wompi.sv/abc",
        urlEnlaceLargo: "https://wompi.sv/pago/abc",
        urlQrCodeEnlace: "https://wompi.sv/qr/abc",
        estaProductivo: false,
      });

      const result = await service.initiatePayment({
        amount: 25.5,
        currency_code: "USD",
        data: { session_id: "ps_123" },
      } as any);

      expect(result.id).toBe("123");
      expect(result.data.urlEnlace).toBe("https://lk.wompi.sv/abc");
      expect(result.data.session_id).toBe("ps_123");

      const callArg = client.createPaymentLink.mock.calls[0][0];
      expect(callArg.identificadorEnlaceComercio).toBe("ps_123");
      expect(callArg.monto).toBe(25.5);
      expect(callArg.limitesDeUso.cantidadMaximaPagosExitosos).toBe(1);
      expect(callArg.formaPago.permitirTarjetaCreditoDebido).toBe(true);
    });

    it("throws on API failure", async () => {
      const { service, client } = buildService();
      client.createPaymentLink.mockRejectedValueOnce(new Error("timeout"));

      await expect(
        service.initiatePayment({ amount: 10, currency_code: "USD", data: { session_id: "ps_x" } } as any)
      ).rejects.toThrow("Failed to create Wompi payment link");
    });
  });

  describe("authorizePayment", () => {
    it("returns CAPTURED when transaccionCompra is approved", async () => {
      const { service, client } = buildService();

      client.getPaymentLink.mockResolvedValueOnce({
        idEnlace: 100,
        transaccionCompra: { esAprobada: true, idTransaccion: "tx_1", monto: 10 },
        transacciones: [],
      });

      const result = await service.authorizePayment({ data: { idEnlace: 100 } } as any);

      expect(result.status).toBe("authorized");
      expect(result.data.idEnlace).toBe(100);
    });

    it("returns AUTHORIZED from transacciones array fallback", async () => {
      const { service, client } = buildService();

      client.getPaymentLink.mockResolvedValueOnce({
        idEnlace: 101,
        transaccionCompra: null,
        transacciones: [
          { esAprobada: false, idTransaccion: "tx_fail" },
          { esAprobada: true, idTransaccion: "tx_ok", monto: 20 },
        ],
      });

      const result = await service.authorizePayment({ data: { idEnlace: 101 } } as any);
      expect(result.status).toBe("authorized");
    });

    it("returns AUTHORIZED when no approved transaction (webhook is source of truth)", async () => {
      const { service, client } = buildService();

      client.getPaymentLink.mockResolvedValueOnce({
        idEnlace: 102,
        transaccionCompra: null,
        transacciones: [],
      });

      const result = await service.authorizePayment({ data: { idEnlace: 102 } } as any);
      expect(result.status).toBe("authorized");
    });

    it("returns AUTHORIZED when idEnlace is missing (webhook-initiated flow)", async () => {
      const { service } = buildService();
      const result = await service.authorizePayment({ data: {} } as any);
      expect(result.status).toBe("authorized");
    });
  });

  describe("capturePayment", () => {
    it("is a no-op that returns existing data", async () => {
      const { service } = buildService();
      const result = await service.capturePayment({ data: { foo: "bar" } } as any);
      expect(result.data).toEqual({ foo: "bar" });
    });
  });

  describe("cancelPayment", () => {
    it("deactivates the payment link", async () => {
      const { service, client } = buildService();
      client.deactivatePaymentLink.mockResolvedValueOnce({ idEnlace: 200, usable: false });

      await service.cancelPayment({ data: { idEnlace: 200 } } as any);
      expect(client.deactivatePaymentLink).toHaveBeenCalledWith(200);
    });

    it("returns gracefully when idEnlace is missing", async () => {
      const { service, client } = buildService();
      const result = await service.cancelPayment({ data: {} } as any);
      expect(client.deactivatePaymentLink).not.toHaveBeenCalled();
      expect(result.data).toEqual({});
    });
  });

  describe("refundPayment", () => {
    it("returns pending_manual refund data without throwing", async () => {
      const { service } = buildService();
      const result = await service.refundPayment({ amount: 10, data: { idEnlace: 100 } } as any);
      expect(result.data.refund_status).toBe("pending_manual");
      expect(result.data.refund_amount).toBe(10);
      expect(result.data.idEnlace).toBe(100);
    });
  });

  describe("getPaymentStatus", () => {
    it("returns captured when transaction is approved", async () => {
      const { service, client } = buildService();
      client.getTransaction.mockResolvedValueOnce({ esAprobada: true, monto: 15 });

      const result = await service.getPaymentStatus({ data: { idTransaccion: "tx_1" } } as any);
      expect(result.status).toBe("captured");
    });

    it("returns error when transaction is rejected", async () => {
      const { service, client } = buildService();
      client.getTransaction.mockResolvedValueOnce({
        esAprobada: false,
        mensaje: "Fondos insuficientes",
      });

      const result = await service.getPaymentStatus({ data: { idTransaccion: "tx_2" } } as any);
      expect(result.status).toBe("error");
      expect(result.data.error_message).toBe("Fondos insuficientes");
    });

    it("falls back to enlace lookup when no idTransaccion", async () => {
      const { service, client } = buildService();
      client.getPaymentLink.mockResolvedValueOnce({
        transaccionCompra: { esAprobada: true },
        usable: true,
      });

      const result = await service.getPaymentStatus({ data: { idEnlace: 300 } } as any);
      expect(result.status).toBe("captured");
    });

    it("returns canceled when enlace is not usable", async () => {
      const { service, client } = buildService();
      client.getPaymentLink.mockResolvedValueOnce({
        transaccionCompra: null,
        usable: false,
      });

      const result = await service.getPaymentStatus({ data: { idEnlace: 301 } } as any);
      expect(result.status).toBe("canceled");
    });
  });

  describe("deletePayment", () => {
    it("deactivates the link", async () => {
      const { service, client } = buildService();
      client.deactivatePaymentLink.mockResolvedValueOnce({});

      await service.deletePayment({ data: { idEnlace: 400 } } as any);
      expect(client.deactivatePaymentLink).toHaveBeenCalledWith(400);
    });

    it("swallows errors gracefully", async () => {
      const { service, client } = buildService();
      client.deactivatePaymentLink.mockRejectedValueOnce(new Error("network"));

      const result = await service.deletePayment({ data: { idEnlace: 401 } } as any);
      expect(result).toEqual({});
    });
  });

  describe("getWebhookActionAndData", () => {
    const makePayload = (body: Record<string, unknown>, secret: string) => {
      const raw = JSON.stringify(body);
      const hmac = createHmac("sha256", secret);
      hmac.update(raw);
      const hash = hmac.digest("hex");

      return {
        data: body,
        rawData: raw,
        headers: { wompi_hash: hash, "content-type": "application/json" },
      };
    };

    it("returns SUCCESSFUL for ExitosaAprobada with valid HMAC", async () => {
      const { service, options } = buildService();

      const body = {
        ResultadoTransaccion: "ExitosaAprobada",
        Monto: 50,
        IdTransaccion: "tx_abc",
        EnlacePago: { Id: 500, IdentificadorEnlaceComercio: "ps_xyz", NombreProducto: "Test" },
      };

      const payload = makePayload(body, options.apiSecret);
      const result = await service.getWebhookActionAndData(payload as any);

      expect(result.action).toBe("captured");
      expect((result as any).data.session_id).toBe("ps_xyz");
      expect((result as any).data.amount).toBe(50);
    });

    it("returns NOT_SUPPORTED for non-approved transactions", async () => {
      const { service, options } = buildService();

      const body = {
        ResultadoTransaccion: "Fallida",
        Monto: 10,
        IdTransaccion: "tx_fail",
        EnlacePago: { Id: 501, IdentificadorEnlaceComercio: "ps_fail" },
      };

      const payload = makePayload(body, options.apiSecret);
      const result = await service.getWebhookActionAndData(payload as any);
      expect(result.action).toBe("not_supported");
    });

    it("throws on invalid HMAC signature", async () => {
      const { service } = buildService();

      const payload = {
        data: { ResultadoTransaccion: "ExitosaAprobada" },
        rawData: '{"ResultadoTransaccion":"ExitosaAprobada"}',
        headers: { wompi_hash: "invalid_hash" },
      };

      await expect(service.getWebhookActionAndData(payload as any)).rejects.toThrow(
        "Invalid Wompi webhook signature"
      );
    });

    it("throws when wompi_hash header is missing", async () => {
      const { service } = buildService();

      const payload = {
        data: {},
        rawData: "{}",
        headers: {},
      };

      await expect(service.getWebhookActionAndData(payload as any)).rejects.toThrow("Missing wompi_hash");
    });
  });

  describe("createPaymentLink (public helper)", () => {
    it("calls client with correct defaults", async () => {
      const { service, client } = buildService();

      client.createPaymentLink.mockResolvedValueOnce({
        idEnlace: 600,
        urlEnlace: "https://lk.wompi.sv/test",
      });

      const result = await service.createPaymentLink({
        paymentSessionId: "ps_helper",
        amount: 99.99,
      });

      expect(result.idEnlace).toBe(600);
      const arg = client.createPaymentLink.mock.calls[0][0];
      expect(arg.identificadorEnlaceComercio).toBe("ps_helper");
      expect(arg.monto).toBe(99.99);
      expect(arg.configuracion.urlWebhook).toBe("https://example.com/hooks/payment/wompi_wompi");
    });
  });
});
