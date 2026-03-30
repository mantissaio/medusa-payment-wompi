import { useQueryGraphStep } from "@medusajs/medusa/core-flows";
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { validateAmountStep, ValidateAmountStepInput } from "../steps/validate-amount";
import { createPaymentLinkStep } from "../steps/create-payment-link";

type CreateWompiPaymentLinkWorkflowInput = {
  paymentSessionId: string;
};

export const createWompiPaymentLinkWorkflow = createWorkflow(
  "create-wompi-payment-link",
  ({ paymentSessionId }: CreateWompiPaymentLinkWorkflowInput) => {
    //@ts-ignore
    const { data: paymentSession } = useQueryGraphStep({
      entity: "payment_session",
      fields: ["amount", "provider_id"],
      filters: { id: paymentSessionId },
      options: { throwIfKeyNotFound: true, isList: false },
    }).config({ name: "get-payment-session" });

    const validateInput: ValidateAmountStepInput = transform(
      { paymentSession },
      ({ paymentSession }) => ({ medusaAmount: Number(paymentSession.amount) })
    );

    validateAmountStep(validateInput);

    const updatedPaymentSession = createPaymentLinkStep({ paymentSessionId });

    return new WorkflowResponse(updatedPaymentSession);
  }
);
