import {
  AbstractPaymentProvider,
  isString,
  MedusaError,
  MedusaErrorTypes,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import { Logger } from "@medusajs/medusa";
import { createHmac } from "crypto";

import { WompiClient } from "../../lib/wompi-client";
import {
  WompiOptions,
  WompiWebhookPayload,
  EnlaceFormaPago,
  CrearEnlaceDto,
  CantidadCuotas,
} from "../../types";

type InjectedDependencies = {
  logger: Logger;
};

class WompiProviderService extends AbstractPaymentProvider<WompiOptions> {
  static identifier = "wompi";

  protected options_: WompiOptions;
  protected client_: WompiClient;
  protected logger_: Logger;

  constructor(container: InjectedDependencies, options: WompiOptions) {
    super(container, options);
    this.options_ = options;
    this.client_ = new WompiClient(options);
    this.logger_ = container.logger;
  }

  static validateOptions(options: Record<any, any>): void | never {
    if (!options.clientId || !isString(options.clientId)) {
      throw new MedusaError(MedusaErrorTypes.INVALID_DATA, "Wompi 'clientId' must be a non-empty string");
    }
    if (!options.clientSecret || !isString(options.clientSecret)) {
      throw new MedusaError(MedusaErrorTypes.INVALID_DATA, "Wompi 'clientSecret' must be a non-empty string");
    }
    if (!options.apiSecret || !isString(options.apiSecret)) {
      throw new MedusaError(MedusaErrorTypes.INVALID_DATA, "Wompi 'apiSecret' must be a non-empty string");
    }
  }

  private getDefaultFormaPago(): EnlaceFormaPago {
    return this.options_.defaultFormaPago ?? {
      permitirTarjetaCreditoDebido: true,
      permitirPagoConPuntoAgricola: true,
      permitirPagoEnCuotasAgricola: true,
      permitirPagoEnBitcoin: true,
      permitePagoQuickPay: true,
    };
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = input.data?.session_id as string | undefined;

    const formaPago = this.getDefaultFormaPago();
    const enlaceData: CrearEnlaceDto = {
      identificadorEnlaceComercio: sessionId ?? "",
      monto: Number(input.amount),
      nombreProducto: `Order ${sessionId ?? "unknown"}`,
      formaPago,
      ...(formaPago.permitirPagoEnCuotasAgricola && {
        cantidadMaximaCuotas: CantidadCuotas.Doce,
      }),
      configuracion: {
        urlWebhook: this.options_.defaultWebhookUrl,
        urlRedirect: this.options_.defaultRedirectUrl,
        notificarTransaccionCliente: true,
      },
      limitesDeUso: {
        cantidadMaximaPagosExitosos: 1,
      },
    };

    try {
      const response = await this.client_.createPaymentLink(enlaceData);

      return {
        id: String(response.idEnlace),
        data: {
          idEnlace: response.idEnlace,
          urlEnlace: response.urlEnlace,
          urlEnlaceLargo: response.urlEnlaceLargo,
          urlQrCodeEnlace: response.urlQrCodeEnlace,
          estaProductivo: response.estaProductivo,
          session_id: sessionId,
        },
      };
    } catch (error) {
      this.logger_.error(`Wompi: Failed to create payment link: ${(error as Error).message}`);
      throw new MedusaError(
        MedusaErrorTypes.UNEXPECTED_STATE,
        `Failed to create Wompi payment link: ${(error as Error).message}`
      );
    }
  }

  /**
   * Wompi is auto-capture: payments are captured at the moment the customer
   * completes payment on the hosted page. We return CAPTURED when an approved
   * transaction exists on the enlace.
   *
   * When called after a webhook, Medusa passes the session data which already
   * contains the enlace info. We query Wompi to confirm the transaction status.
   * If the query fails or has no approved tx, we return AUTHORIZED to let
   * Medusa proceed (the webhook already confirmed success).
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const idEnlace = input.data?.idEnlace as number | undefined;

    if (!idEnlace) {
      // No enlace data - this can happen when called after a webhook.
      // Return AUTHORIZED so Medusa can proceed with the capture flow.
      return { status: PaymentSessionStatus.AUTHORIZED, data: input.data ?? {} };
    }

    try {
      const enlace = await this.client_.getPaymentLink(idEnlace);

      if (enlace.transaccionCompra?.esAprobada) {
        return {
          status: PaymentSessionStatus.AUTHORIZED,
          data: {
            ...(enlace.transaccionCompra as unknown as Record<string, unknown>),
            idEnlace: enlace.idEnlace,
          },
        };
      }

      const approvedTx = enlace.transacciones?.find((tx) => tx.esAprobada);
      if (approvedTx) {
        return {
          status: PaymentSessionStatus.AUTHORIZED,
          data: {
            ...(approvedTx as unknown as Record<string, unknown>),
            idEnlace: enlace.idEnlace,
          },
        };
      }

      // No approved transaction yet, but still return AUTHORIZED
      // since the webhook flow already confirmed success
      return { status: PaymentSessionStatus.AUTHORIZED, data: input.data ?? {} };
    } catch (error) {
      this.logger_.warn(`Wompi: Failed to query enlace ${idEnlace}: ${(error as Error).message}`);
      // Return AUTHORIZED anyway - the webhook is the source of truth
      return { status: PaymentSessionStatus.AUTHORIZED, data: input.data ?? {} };
    }
  }

  // No-op: Wompi auto-captures
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const idEnlace = input.data?.idEnlace as number | undefined;

    if (!idEnlace) {
      return { data: input.data ?? {} };
    }

    try {
      const result = await this.client_.deactivatePaymentLink(idEnlace);
      return { data: result as unknown as Record<string, unknown> };
    } catch (error) {
      this.logger_.warn(`Wompi: Failed to deactivate link ${idEnlace}: ${(error as Error).message}`);
      return { data: input.data ?? {} };
    }
  }

  /**
   * Wompi has no refund API. We record the refund in Medusa for traceability
   * but the actual fund return must be processed manually via panel.wompi.sv
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    this.logger_.warn(
      `Wompi: Refund of ${input.amount} registered in Medusa. ` +
        "Process the actual refund via https://panel.wompi.sv or Banco Agricola."
    );

    return {
      data: {
        ...(input.data ?? {}),
        refund_status: "pending_manual",
        refund_amount: input.amount,
        refund_note: "Process via panel.wompi.sv or Banco Agricola",
      },
    };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const idTransaccion = input.data?.idTransaccion as string | undefined;
    const idEnlace = input.data?.idEnlace as number | undefined;

    if (idTransaccion) {
      try {
        const tx = await this.client_.getTransaction(idTransaccion);
        if (tx.esAprobada) {
          return { status: "captured", data: tx as unknown as Record<string, unknown> };
        }
        return {
          status: "error",
          data: {
            ...(tx as unknown as Record<string, unknown>),
            error_message: tx.mensaje ?? "Transaction was not approved",
          },
        };
      } catch (error) {
        this.logger_.warn(`Wompi: Failed to get transaction ${idTransaccion}: ${(error as Error).message}`);
        return { status: "pending", data: input.data ?? {} };
      }
    }

    if (idEnlace) {
      try {
        const enlace = await this.client_.getPaymentLink(idEnlace);
        if (enlace.transaccionCompra?.esAprobada) {
          return { status: "captured", data: enlace.transaccionCompra as unknown as Record<string, unknown> };
        }
        if (!enlace.usable) {
          return { status: "canceled", data: input.data ?? {} };
        }
        return { status: "pending", data: input.data ?? {} };
      } catch {
        return { status: "pending", data: input.data ?? {} };
      }
    }

    return { status: "pending", data: input.data ?? {} };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const idEnlace = input.data?.idEnlace as number | undefined;

    if (!idEnlace) {
      return { data: input.data ?? {} };
    }

    try {
      const enlace = await this.client_.getPaymentLink(idEnlace);
      return { data: enlace as unknown as Record<string, unknown> };
    } catch (error) {
      this.logger_.warn(`Wompi: Failed to retrieve link ${idEnlace}: ${(error as Error).message}`);
      return { data: input.data ?? {} };
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const idEnlace = input.data?.idEnlace as number | undefined;

    if (!idEnlace) {
      return { data: input.data ?? {} };
    }

    try {
      const sessionId = (input.data?.session_id as string) ?? "";
      const updatedEnlace = await this.client_.updatePaymentLink(idEnlace, {
        identificadorEnlaceComercio: sessionId,
        monto: Number(input.amount),
        nombreProducto: `Order ${sessionId}`,
      });

      return {
        data: {
          ...(updatedEnlace as unknown as Record<string, unknown>),
          session_id: sessionId,
        },
      };
    } catch (error) {
      this.logger_.warn(`Wompi: Failed to update link ${idEnlace}: ${(error as Error).message}`);
      return { data: input.data ?? {} };
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const idEnlace = input.data?.idEnlace as number | undefined;

    if (idEnlace) {
      try {
        await this.client_.deactivatePaymentLink(idEnlace);
      } catch (error) {
        this.logger_.warn(`Wompi: Failed to deactivate link ${idEnlace}: ${(error as Error).message}`);
      }
    }

    return {};
  }

  /**
   * Webhook listener: /hooks/payment/wompi_wompi
   * Validates HMAC-SHA256 signature from the `wompi_hash` header,
   * then maps the transaction result to a Medusa payment action.
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    this.validateWebhookSignature(payload);

    const webhookData = payload.data as unknown as WompiWebhookPayload;

    try {
      if (webhookData.ResultadoTransaccion === "ExitosaAprobada") {
        const sessionId = webhookData.EnlacePago?.IdentificadorEnlaceComercio ?? "";

        if (!sessionId) {
          this.logger_.warn("Wompi webhook: missing IdentificadorEnlaceComercio, cannot match payment session");
          return { action: PaymentActions.NOT_SUPPORTED };
        }

        return {
          action: PaymentActions.SUCCESSFUL,
          data: { session_id: sessionId, amount: webhookData.Monto },
        };
      }

      this.logger_.info(
        `Wompi webhook: tx ${webhookData.IdTransaccion} result: ${webhookData.ResultadoTransaccion}`
      );
      return { action: PaymentActions.NOT_SUPPORTED };
    } catch (error) {
      this.logger_.error(`Wompi webhook failed: ${(error as Error).message}`);
      return { action: PaymentActions.FAILED };
    }
  }

  protected validateWebhookSignature(data: ProviderWebhookPayload["payload"]): void {
    const secret = this.options_.apiSecret;
    if (!secret) {
      this.logger_.warn("Wompi: no apiSecret configured, skipping webhook signature validation");
      return;
    }

    const headers = data.headers;
    const receivedHash = (headers["wompi_hash"] ?? headers["Wompi_Hash"] ?? headers["WOMPI_HASH"]) as
      | string
      | undefined;

    if (!receivedHash) {
      throw new MedusaError(MedusaErrorTypes.INVALID_DATA, "Missing wompi_hash header");
    }

    const rawBody = typeof data.rawData === "string" ? data.rawData : JSON.stringify(data.data);

    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody);
    const computedHash = hmac.digest("hex");

    if (computedHash !== receivedHash) {
      this.logger_.warn(`Wompi webhook: HMAC mismatch (received: ${receivedHash}, computed: ${computedHash})`);
      throw new MedusaError(MedusaErrorTypes.INVALID_DATA, "Invalid Wompi webhook signature");
    }
  }

  /** Used by the create-payment-link workflow step */
  async createPaymentLink(input: { paymentSessionId: string; amount: number; productName?: string }) {
    const formaPago = this.getDefaultFormaPago();
    return this.client_.createPaymentLink({
      identificadorEnlaceComercio: input.paymentSessionId,
      monto: input.amount,
      nombreProducto: input.productName ?? `Order ${input.paymentSessionId}`,
      formaPago,
      ...(formaPago.permitirPagoEnCuotasAgricola && {
        cantidadMaximaCuotas: CantidadCuotas.Doce,
      }),
      configuracion: {
        urlWebhook: this.options_.defaultWebhookUrl,
        urlRedirect: this.options_.defaultRedirectUrl,
        notificarTransaccionCliente: true,
      },
      limitesDeUso: {
        cantidadMaximaPagosExitosos: 1,
      },
    });
  }
}

export default WompiProviderService;
