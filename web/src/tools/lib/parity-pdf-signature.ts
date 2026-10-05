export const MAX_PDF_SIGNATURE_FILE_SIZE = 10_000_000;

export interface PdfCertificateSummary {
  subject: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  signer: boolean;
}

export interface PdfSignatureInspection {
  signatures: { certificates: PdfCertificateSummary[] }[];
  verificationPerformed: false;
}

function name(attributes?: Record<string, unknown>): string {
  if (!attributes) return '未知';
  return String(attributes.commonName ?? attributes.organizationName ?? '未知');
}

function date(value?: Date | string): string {
  if (!value) return '未知';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '未知' : parsed.toISOString().slice(0, 10);
}

export async function inspectPdfSignatures(file: File): Promise<PdfSignatureInspection> {
  if (file.size > MAX_PDF_SIGNATURE_FILE_SIZE) throw new Error('文件不能超过 10 MB');
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error('请选择有效的 PDF 文件');
  }

  const module = await import('pdf-signature-reader');
  const reader = module.default;
  try {
    const chains = reader.getCertificatesInfoFromPDF(buffer);
    return {
      signatures: chains.map((certificates) => ({
        certificates: certificates.map((certificate) => ({
          subject: name(certificate.issuedTo),
          issuer: name(certificate.issuedBy),
          notBefore: date(certificate.validityPeriod?.notBefore),
          notAfter: date(certificate.validityPeriod?.notAfter),
          signer: certificate.clientCertificate === true,
        })),
      })),
      verificationPerformed: false,
    };
  } catch {
    throw new Error('未能读取 PDF 数字签名；文件可能没有受支持的签名或已损坏');
  }
}
