import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import WompiProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [WompiProviderService],
});
