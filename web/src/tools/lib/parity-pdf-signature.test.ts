import { describe, expect, it, vi } from 'vitest';

const { getCertificatesInfoFromPDF } = vi.hoisted(() => ({ getCertificatesInfoFromPDF: vi.fn() }));
vi.mock('pdf-signature-reader', () => ({ default: { getCertificatesInfoFromPDF } }));

import { inspectPdfSignatures } from './parity-pdf-signature';

describe('PDF signature inspection', () => {
  it('rejects a non-PDF by its header before parsing', async () => {
    await expect(inspectPdfSignatures(new File(['hello'], 'fake.pdf'))).rejects.toThrow('PDF');
    expect(getCertificatesInfoFromPDF).not.toHaveBeenCalled();
  });

  it('rejects oversized files before reading', async () => {
    const file = new File([new Uint8Array(10_000_001)], 'large.pdf', { type: 'application/pdf' });
    await expect(inspectPdfSignatures(file)).rejects.toThrow('10 MB');
  });

  it('returns detected certificate fields without a validity claim', async () => {
    getCertificatesInfoFromPDF.mockReturnValueOnce([
      [
        {
          issuedTo: { commonName: 'Alice' },
          issuedBy: { commonName: 'Example CA' },
          validityPeriod: { notBefore: new Date('2024-01-01'), notAfter: new Date('2028-01-01') },
          clientCertificate: true,
          pemCertificate: 'secret',
        },
      ],
    ]);
    const result = await inspectPdfSignatures(new File(['%PDF-1.7\n'], 'signed.pdf'));
    expect(result).toEqual({
      signatures: [
        {
          certificates: [
            {
              subject: 'Alice',
              issuer: 'Example CA',
              notBefore: '2024-01-01',
              notAfter: '2028-01-01',
              signer: true,
            },
          ],
        },
      ],
      verificationPerformed: false,
    });
  });
});
