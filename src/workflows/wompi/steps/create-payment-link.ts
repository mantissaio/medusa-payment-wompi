import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError, MedusaErrorTypes, Modules } from "@medusajs/framework/utils";
import { PaymentSessionDTO } from "@medusajs/framework/types";
import WompiProviderService from "../../../providers/wompi/service";

type CreatePaymentLinkStepInput = {
  paymentSessionId: string;
};

export const createPaymentLinkStep = createStep<CreatePaymentLinkStepInput, PaymentSessionDTO, undefined>(
  "create-wompi-payment-link",
  async ({ paymentSessionId }, { container }) => {
    const wompiProvider = container
      .resolve("payment")
      //@ts-ignore
      .paymentProviderService_.retrieveProvider("pp_wompi_wompi") as WompiProviderService;

    const paymentModuleService = container.resolve(Modules.PAYMENT);

    const paymentSession = await paymentModuleService.retrievePaymentSession(paymentSessionId, {
      select: ["amount", "currency_code"],
    });

    if (!paymentSession) {
      throw new MedusaError(MedusaErrorTypes.NOT_FOUND, `Payment session ${paymentSessionId} not found`);
    }

    const linkResponse = await wompiProvider.createPaymentLink({
      paymentSessionId,
      amount: Number(paymentSession.amount),
    });

    const updatedSession = await paymentModuleService.updatePaymentSession({
      id: paymentSessionId,
      amount: paymentSession.amount,
      currency_code: paymentSession.currency_code,
      data: {
        idEnlace: linkResponse.idEnlace,
        urlEnlace: linkResponse.urlEnlace,
        urlEnlaceLargo: linkResponse.urlEnlaceLargo,
        urlQrCodeEnlace: linkResponse.urlQrCodeEnlace,
        estaProductivo: linkResponse.estaProductivo,
        session_id: paymentSessionId,
      },
    });

    return new StepResponse(updatedSession);
  }
);
