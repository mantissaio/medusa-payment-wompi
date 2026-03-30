import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework";
import { PostStoreWompiPaymentLink } from "./payment-link/validators";

export const wompiMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/wompi/payment-link",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreWompiPaymentLink)],
  },
];
