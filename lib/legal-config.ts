/**
 * Datos del titular que exige la LSSI-CE (art. 10) y el RGPD (art. 13).
 * Rellena los campos vacíos: mientras estén vacíos, las páginas legales
 * muestran un aviso «PENDIENTE» resaltado en su lugar.
 */
export const LEGAL = {
  appName: "NimChat",
  ownerName: "", // Nombre y apellidos o razón social
  ownerTaxId: "", // NIF/CIF
  ownerAddress: "", // Domicilio
  contactEmail: "", // Correo de contacto (también para derechos RGPD)
  repoUrl: "https://github.com/Pausiar/NIMChat",
  lastUpdated: "19 de octubre de 2026",
} as const;
