export interface WompiOptions {
  /** App ID from the Wompi panel (clientIdApi in OAuth) */
  clientId: string;
  /** API Secret for OAuth client_credentials */
  clientSecret: string;
  /** API Secret for HMAC-SHA256 webhook validation */
  apiSecret: string;
  sandbox?: boolean;
  defaultRedirectUrl?: string;
  /** Typically: https://your-domain.com/hooks/payment/wompi_wompi */
  defaultWebhookUrl?: string;
  defaultFormaPago?: EnlaceFormaPago;
}

// Enums (integer-based, matching Wompi swagger)

export enum ResultadoTransaccion {
  ExitosaAprobada = 0,
  Fallida = 1,
  FalloComunicacion = 2,
}

export enum FormaPago {
  PagoNormal = 0,
  Puntos = 1,
  Cuotas = 2,
  Bitcoin = 3,
  QuickPay = 4,
  Nequi = 5,
}

export enum CantidadCuotas {
  Una = 1,
  Dos = 2,
  Tres = 3,
  Cuatro = 4,
  Cinco = 5,
  Seis = 6,
  Siete = 7,
  Ocho = 8,
  Nueve = 9,
  Diez = 10,
  Once = 11,
  Doce = 12,
  Dieciocho = 18,
  Veinticuatro = 24,
  TreintaSeis = 36,
}

export enum EstadoSuscripcion {
  Activa = 0,
  Inactiva = 1,
  Cancelada = 2,
  Suspendida = 3,
  Vencida = 4,
}

// EnlacePago DTOs

export interface EnlaceFormaPago {
  permitirTarjetaCreditoDebido: boolean;
  permitirPagoConPuntoAgricola: boolean;
  permitirPagoEnCuotasAgricola: boolean;
  permitirPagoEnBitcoin: boolean;
  permitePagoQuickPay: boolean;
}

export interface EnlaceInfoProducto {
  descripcionProducto?: string;
  urlImagenProducto?: string;
}

export interface EnlaceConfiguracion {
  urlRedirect?: string;
  esMontoEditable?: boolean;
  esCantidadEditable?: boolean;
  cantidadPorDefecto?: number;
  duracionInterfazIntentoMinutos?: number;
  urlRetorno?: string;
  emailsNotificacion?: string;
  urlWebhook?: string;
  telefonosNotificacion?: string;
  notificarTransaccionCliente?: boolean;
}

export interface EnlaceVigencia {
  fechaInicio: string;
  fechaFin?: string;
}

export interface EnlaceLimitesUso {
  cantidadMaximaPagosExitosos?: number;
  cantidadMaximaPagosFallidos?: number;
}

/** POST /EnlacePago */
export interface CrearEnlaceDto {
  idAplicativo?: string;
  identificadorEnlaceComercio: string;
  monto?: number;
  nombreProducto: string;
  formaPago?: EnlaceFormaPago;
  cantidadMaximaCuotas?: CantidadCuotas;
  infoProducto?: EnlaceInfoProducto;
  configuracion?: EnlaceConfiguracion;
  vigencia?: EnlaceVigencia;
  limitesDeUso?: EnlaceLimitesUso;
  datosAdicionales?: Record<string, string>;
  idGrupoTarjetas?: string;
}

export interface CrearEnlacePagoOutput {
  idEnlace: number;
  urlQrCodeEnlace?: string;
  urlEnlace?: string;
  estaProductivo: boolean;
  urlEnlaceLargo?: string;
}

/** PUT /EnlacePago/{id} */
export interface EditarEnlaceDto {
  identificadorEnlaceComercio: string;
  monto?: number;
  nombreProducto: string;
  formaPago?: EnlaceFormaPago;
  cantidadMaximaCuotas?: CantidadCuotas;
  infoProducto?: EnlaceInfoProducto;
  configuracion?: EnlaceConfiguracion;
  vigencia?: EnlaceVigencia;
  limitesDeUso?: EnlaceLimitesUso;
  datosAdicionales?: Record<string, string>;
  idGrupoTarjetas?: string;
}

// TransaccionCompra DTOs

export interface TransaccionCompraOutput {
  idTransaccion?: string;
  esReal: boolean;
  esAprobada: boolean;
  codigoAutorizacion?: string;
  mensaje?: string;
  formaPago: FormaPago;
  monto: number;
  idExterno?: string;
  resultadoTransaccion: ResultadoTransaccion;
  fechaTransaccion?: string;
  montoOriginal?: number;
  datosAdicionales?: Record<string, string>;
}

/** GET /TransaccionCompra/{id} */
export interface DetalleTransaccionCompraOutput extends TransaccionCompraOutput {
  datosBitcoin?: {
    urlQR?: string;
    qrData?: string;
    ammountInBitcoins: number;
    ammountInDollars: number;
    fechaVencimiento: string;
  };
}

// EnlacePago full output

export interface ImagenEnlacePagoOutput {
  url?: string;
  esPrincipal: boolean;
}

/** GET /EnlacePago/{id} */
export interface EnlacePagoOutput {
  idAplicativo?: string;
  nombreEnlace?: string;
  monto?: number;
  nombreProducto?: string;
  usable: boolean;
  transaccionCompra?: TransaccionCompraOutput;
  transacciones?: TransaccionCompraOutput[];
  cantidadIntentoPagoFallidos: number;
  cantidadPagosExitosos: number;
  formaPago?: EnlaceFormaPago;
  infoProducto?: EnlaceInfoProducto;
  configuracion?: EnlaceConfiguracion;
  cantidadMaximaCuotas?: number;
  nombreAplicativo?: string;
  imagenes?: ImagenEnlacePagoOutput[];
  vigencia?: EnlaceVigencia;
  limitesDeUso?: EnlaceLimitesUso;
  datosAdicionales?: Record<string, string>;
  idGrupoTarjetas?: string;
  idEnlace: number;
  urlQrCodeEnlace?: string;
  urlEnlace?: string;
  estaProductivo: boolean;
  urlEnlaceLargo?: string;
}

// Tokenizacion DTOs

export interface TokenizarTarjetaDto {
  numeroTarjeta: string;
  cvv: string;
  mesVencimiento: number;
  anioVencimiento: number;
  nombreEnTarjeta?: string;
  idGrupoTarjetas?: string;
}

export interface TokenizarTarjetaOutput {
  token?: string;
  tarjetaEnmascarada?: string;
}

export interface CreditCardTokenOutput {
  tokenId?: string;
  tokenProvider?: string;
  accountId?: string;
  externalId?: string;
  maskedCreditCardNumber?: string;
  creationDate: string;
  dynamicFields?: { fieldName?: string; fieldValue?: string }[];
}

// EnlacePagoRecurrente DTOs

export interface CrearEnlacePagoRecurrenteDto {
  diaDePago: number;
  nombre: string;
  idAplicativo: string;
  monto: number;
  descripcionProducto?: string;
}

export interface CrearEnlacePagoRecurrenteOutput {
  idEnlace?: string;
  urlEnlaceLargo?: string;
  urlEnlace?: string;
  estaProductivo: boolean;
  urlQrCodeEnlace?: string;
}

export interface EnlacesPagoRecurrenteOutput {
  id?: string;
  nombre?: string;
  idAplicativo?: string;
  monto: number;
  descripcionProducto?: string;
  diaDePago: number;
  estaActivo: boolean;
  urlCortaSuscribirse?: string;
  urlLargaSuscribirse?: string;
  urlImagenPrincipal?: string;
  urlSuscribirseQr?: string;
  fechaCreacion: string;
}

export interface EditarEnlacePagoRecurrenteDto {
  diaDePago?: number;
  nombre: string;
  idAplicativo: string;
  monto: number;
  descripcionProducto?: string;
}

// Aplicativo DTOs

export interface CuotasOutput {
  cantidadCuotas: CantidadCuotas;
  tasa: number;
}

export interface AplicativoOutput {
  idAplicativo?: string;
  clientIdApi?: string;
  clientSecret?: string;
  numeroCuenta?: string;
  nombre?: string;
  urlAplicativo?: string;
  estaProductivo: boolean;
  urlLogo?: string;
  aplicaPagoConPuntos: boolean;
  aplicaPagoConBitcoin: boolean;
  aplicaPagoConQuickPay: boolean;
  cuotasDisponibles?: CuotasOutput[];
}

// OAuth

export interface WompiAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Webhook payload (HTTP POST from Wompi)

export interface WompiWebhookPayload {
  IdCuenta: string;
  FechaTransaccion: string;
  Monto: number;
  ModuloUtilizado: string;
  FormaPagoUtilizada: string;
  IdTransaccion: string;
  ResultadoTransaccion: string;
  CodigoAutorizacion: string;
  IdIntentoPago: string;
  Cantidad: number;
  EsProductiva: boolean;
  Aplicativo: {
    Nombre: string;
    Url: string;
    Id: string;
  };
  EnlacePago?: {
    Id: number;
    IdentificadorEnlaceComercio: string;
    NombreProducto: string;
  };
  cliente?: Record<string, string>;
}

// Generic paged list wrapper

export interface WompiPagedList<T> {
  paginaActual: number;
  cantidadPorPagina: number;
  totalDeElementos: number;
  resultado?: T[];
  totalPaginas: number;
}

// API Error

export interface WompiApiError {
  servicioError?: string;
  mensajes?: string[];
  subTipoError?: string;
}
