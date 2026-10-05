declare module 'pdf-signature-reader' {
  interface Certificate {
    issuedTo?: Record<string, unknown>;
    issuedBy?: Record<string, unknown>;
    validityPeriod?: { notBefore?: Date | string; notAfter?: Date | string };
    clientCertificate?: boolean;
  }

  const reader: {
    getCertificatesInfoFromPDF(data: ArrayBuffer): Certificate[][];
  };

  export default reader;
}
