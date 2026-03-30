import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { MedusaError, MedusaErrorTypes } from "@medusajs/framework/utils";
import { PostStoreWompiPaymentLinkType } from "./validators";
import { createWompiPaymentLinkWorkflow } from "../../../../workflows/wompi/workflows/create-payment-link";

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreWompiPaymentLinkType>,
  res: MedusaResponse
) => {
  const { paymentSessionId } = req.validatedBody;

  const { result } = await createWompiPaymentLinkWorkflow(req.scope).run({
    input: { paymentSessionId },
  });

  const urlEnlace = result.data?.urlEnlace as string | undefined;
  const idEnlace = result.data?.idEnlace as number | undefined;

  if (!urlEnlace) {
    throw new MedusaError(
      MedusaErrorTypes.UNEXPECTED_STATE,
      "Failed to obtain payment link URL from Wompi"
    );
  }

  return res.status(201).json({
    urlEnlace,
    idEnlace,
    urlQrCodeEnlace: result.data?.urlQrCodeEnlace,
    urlEnlaceLargo: result.data?.urlEnlaceLargo,
  });
};
