import { z } from "zod";

export type PostStoreWompiPaymentLinkType = z.infer<
  typeof PostStoreWompiPaymentLink
>;

export const PostStoreWompiPaymentLink = z.object({
  paymentSessionId: z.string().min(1),
});
