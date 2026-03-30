import { MiddlewareRoute } from "@medusajs/framework";
import { wompiMiddlewares } from "./wompi/middlewares";

export const storeMiddlewares: MiddlewareRoute[] = [...wompiMiddlewares];
