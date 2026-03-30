import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { WompiClient, WompiClientError } from "../wompi-client";

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  (global as any).fetch = mockFetch;
  jest.resetAllMocks();
});

afterEach(() => {
  delete (global as any).fetch;
});

const buildClient = () =>
  new WompiClient({
    clientId: "test-id",
    clientSecret: "test-secret",
    apiSecret: "test-api-secret",
  });

const mockAuthResponse = () =>
  new Response(JSON.stringify({ access_token: "tok_123", expires_in: 3600, token_type: "Bearer", scope: "wompi_api" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("WompiClient", () => {
  describe("authentication", () => {
    it("authenticates on first request and caches the token", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify({ idAplicativo: "app_1" }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ idAplicativo: "app_1" }), { status: 200 }));

      await client.getBusinessInfo();
      await client.getBusinessInfo();

      // auth called once, API called twice
      expect(mockFetch).toHaveBeenCalledTimes(3);
      const authCall = mockFetch.mock.calls[0];
      expect(authCall[0]).toBe("https://id.wompi.sv/connect/token");
    });

    it("throws WompiClientError on auth failure", async () => {
      const client = buildClient();
      mockFetch.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));

      await expect(client.getBusinessInfo()).rejects.toThrow(WompiClientError);
    });
  });

  describe("createPaymentLink", () => {
    it("sends POST /EnlacePago with correct body", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ idEnlace: 42, urlEnlace: "https://lk.wompi.sv/x", estaProductivo: false }), {
            status: 200,
          })
        );

      const result = await client.createPaymentLink({
        identificadorEnlaceComercio: "order_1",
        monto: 10.5,
        nombreProducto: "Test Product",
      });

      expect(result.idEnlace).toBe(42);

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[0]).toBe("https://api.wompi.sv/EnlacePago");
      expect((apiCall[1] as any).method).toBe("POST");

      const sentBody = JSON.parse((apiCall[1] as any).body);
      expect(sentBody.identificadorEnlaceComercio).toBe("order_1");
      expect(sentBody.monto).toBe(10.5);
    });
  });

  describe("getPaymentLink", () => {
    it("sends GET /EnlacePago/{id}", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ idEnlace: 55, usable: true }), { status: 200 })
        );

      const result = await client.getPaymentLink(55);
      expect(result.idEnlace).toBe(55);

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[0]).toBe("https://api.wompi.sv/EnlacePago/55");
    });
  });

  describe("deactivatePaymentLink", () => {
    it("sends PUT /EnlacePago/{id}/desactivar", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify({ idEnlace: 77, usable: false }), { status: 200 }));

      await client.deactivatePaymentLink(77);

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[0]).toBe("https://api.wompi.sv/EnlacePago/77/desactivar");
      expect((apiCall[1] as any).method).toBe("PUT");
    });
  });

  describe("getTransaction", () => {
    it("sends GET /TransaccionCompra/{id}", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ idTransaccion: "tx_1", esAprobada: true, monto: 25 }), { status: 200 })
        );

      const result = await client.getTransaction("tx_1");
      expect(result.esAprobada).toBe(true);
    });
  });

  describe("error handling", () => {
    it("throws WompiClientError with parsed API error", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ mensajes: ["Monto invalido", "Campo requerido"], subTipoError: "VALIDATION" }), {
            status: 400,
          })
        );

      try {
        await client.createPaymentLink({
          identificadorEnlaceComercio: "x",
          monto: -1,
          nombreProducto: "Bad",
        });
        fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(WompiClientError);
        const error = err as WompiClientError;
        expect(error.status).toBe(400);
        expect(error.apiError?.mensajes).toEqual(["Monto invalido", "Campo requerido"]);
        expect(error.message).toContain("Monto invalido, Campo requerido");
      }
    });

    it("handles 204 No Content responses", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      const result = await client.deleteTokenizedCard("tok_x");
      expect(result).toBeUndefined();
    });
  });

  describe("tokenization", () => {
    it("sends POST /Tokenizacion", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: "tok_abc", tarjetaEnmascarada: "****1234" }), { status: 200 })
        );

      const result = await client.tokenizeCard({
        numeroTarjeta: "4111111111111111",
        cvv: "123",
        mesVencimiento: 12,
        anioVencimiento: 2028,
      });

      expect(result.token).toBe("tok_abc");
      expect(result.tarjetaEnmascarada).toBe("****1234");
    });

    it("sends GET /Tokenizacion with pagination params", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ resultado: [], totalDeElementos: 0, paginaActual: 1 }), { status: 200 })
        );

      await client.getTokenizedCards(2, 5);

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[0]).toBe("https://api.wompi.sv/Tokenizacion?Pagina=2&CantidadPagina=5");
    });
  });

  describe("recurring links", () => {
    it("sends POST /EnlacePagoRecurrente", async () => {
      const client = buildClient();

      mockFetch
        .mockResolvedValueOnce(mockAuthResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ idEnlace: "rec_1", estaProductivo: false }), { status: 200 })
        );

      const result = await client.createRecurringLink({
        diaDePago: 15,
        nombre: "Suscripcion mensual",
        idAplicativo: "app_1",
        monto: 9.99,
      });

      expect(result.idEnlace).toBe("rec_1");

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[0]).toBe("https://api.wompi.sv/EnlacePagoRecurrente");
    });
  });
});
