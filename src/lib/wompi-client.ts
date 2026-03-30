import {
  WompiOptions,
  WompiAuthResponse,
  WompiApiError,
  WompiPagedList,
  CrearEnlaceDto,
  CrearEnlacePagoOutput,
  EnlacePagoOutput,
  EditarEnlaceDto,
  DetalleTransaccionCompraOutput,
  TokenizarTarjetaDto,
  TokenizarTarjetaOutput,
  CreditCardTokenOutput,
  CrearEnlacePagoRecurrenteDto,
  CrearEnlacePagoRecurrenteOutput,
  EnlacesPagoRecurrenteOutput,
  EditarEnlacePagoRecurrenteDto,
  AplicativoOutput,
} from "../types";

const API_BASE_URL = "https://api.wompi.sv";
const AUTH_URL = "https://id.wompi.sv/connect/token";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

export class WompiClientError extends Error {
  public status: number;
  public apiError?: WompiApiError;

  constructor(message: string, status: number, apiError?: WompiApiError) {
    super(message);
    this.name = "WompiClientError";
    this.status = status;
    this.apiError = apiError;
  }
}

export class WompiClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(options: WompiOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  private async authenticate(): Promise<WompiAuthResponse> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: "wompi_api",
    });

    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new WompiClientError(
        `Wompi authentication failed: ${text}`,
        response.status
      );
    }

    return (await response.json()) as WompiAuthResponse;
  }

  private async ensureAuthenticated(): Promise<string> {
    const now = Date.now();

    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const auth = await this.authenticate();
    this.accessToken = auth.access_token;
    this.tokenExpiresAt = now + auth.expires_in * 1000 - TOKEN_REFRESH_BUFFER_MS;

    return this.accessToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.ensureAuthenticated();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const responseText = await response.text();

    if (!response.ok) {
      let apiError: WompiApiError | undefined;
      try {
        apiError = JSON.parse(responseText) as WompiApiError;
      } catch {
        // not JSON
      }

      const errorMessage = apiError?.mensajes?.join(", ") ?? responseText;
      throw new WompiClientError(
        `Wompi API error [${method} ${path}]: ${errorMessage}`,
        response.status,
        apiError
      );
    }

    if (!responseText) {
      return undefined as T;
    }

    return JSON.parse(responseText) as T;
  }

  // EnlacePago

  async createPaymentLink(data: CrearEnlaceDto): Promise<CrearEnlacePagoOutput> {
    return this.request<CrearEnlacePagoOutput>("POST", "/EnlacePago", data);
  }

  async getPaymentLink(id: number): Promise<EnlacePagoOutput> {
    return this.request<EnlacePagoOutput>("GET", `/EnlacePago/${id}`);
  }

  async updatePaymentLink(id: number, data: EditarEnlaceDto): Promise<EnlacePagoOutput> {
    return this.request<EnlacePagoOutput>("PUT", `/EnlacePago/${id}`, data);
  }

  async deactivatePaymentLink(id: number): Promise<EnlacePagoOutput> {
    return this.request<EnlacePagoOutput>("PUT", `/EnlacePago/${id}/desactivar`);
  }

  async activatePaymentLink(id: number): Promise<EnlacePagoOutput> {
    return this.request<EnlacePagoOutput>("PUT", `/EnlacePago/${id}/activar`);
  }

  // TransaccionCompra

  async getTransaction(id: string): Promise<DetalleTransaccionCompraOutput> {
    return this.request<DetalleTransaccionCompraOutput>("GET", `/TransaccionCompra/${id}`);
  }

  // Tokenizacion

  async tokenizeCard(data: TokenizarTarjetaDto): Promise<TokenizarTarjetaOutput> {
    return this.request<TokenizarTarjetaOutput>("POST", "/Tokenizacion", data);
  }

  async getTokenizedCards(page = 1, pageSize = 10): Promise<WompiPagedList<CreditCardTokenOutput>> {
    return this.request<WompiPagedList<CreditCardTokenOutput>>(
      "GET",
      `/Tokenizacion?Pagina=${page}&CantidadPagina=${pageSize}`
    );
  }

  async deleteTokenizedCard(tokenId: string): Promise<void> {
    await this.request<void>("DELETE", `/Tokenizacion/${tokenId}`);
  }

  // EnlacePagoRecurrente

  async createRecurringLink(data: CrearEnlacePagoRecurrenteDto): Promise<CrearEnlacePagoRecurrenteOutput> {
    return this.request<CrearEnlacePagoRecurrenteOutput>("POST", "/EnlacePagoRecurrente", data);
  }

  async getRecurringLink(id: string): Promise<EnlacesPagoRecurrenteOutput> {
    return this.request<EnlacesPagoRecurrenteOutput>("GET", `/EnlacePagoRecurrente/${id}`);
  }

  async updateRecurringLink(id: string, data: EditarEnlacePagoRecurrenteDto): Promise<EnlacesPagoRecurrenteOutput> {
    return this.request<EnlacesPagoRecurrenteOutput>("PUT", `/EnlacePagoRecurrente/${id}`, data);
  }

  async deactivateRecurringLink(id: string): Promise<EnlacesPagoRecurrenteOutput> {
    return this.request<EnlacesPagoRecurrenteOutput>("POST", `/EnlacePagoRecurrente/${id}`);
  }

  // Aplicativo

  async getBusinessInfo(): Promise<AplicativoOutput> {
    return this.request<AplicativoOutput>("GET", "/Aplicativo");
  }
}
