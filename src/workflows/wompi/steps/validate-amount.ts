import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError, MedusaErrorTypes } from "@medusajs/framework/utils";

export type ValidateAmountStepInput = {
  medusaAmount: number;
};

export const validateAmountStep = createStep<ValidateAmountStepInput, void, undefined>(
  "validate-wompi-amount",
  async ({ medusaAmount }) => {
    if (!medusaAmount || medusaAmount < 0.01) {
      throw new MedusaError(
        MedusaErrorTypes.INVALID_DATA,
        `Invalid payment amount: ${medusaAmount}. Wompi requires at least $0.01.`
      );
    }

    return new StepResponse();
  }
);
