import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { inspectPdfSignatures } = vi.hoisted(() => ({ inspectPdfSignatures: vi.fn() }));
vi.mock('../lib/parity-pdf-signature', () => ({ inspectPdfSignatures }));

import { PdfSignatureTool } from './parity-pdf-signature-tool-panel';

describe('PDF signature panel', () => {
  it('shows detected certificate details and verification limit', async () => {
    inspectPdfSignatures.mockResolvedValueOnce({
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
    render(<PdfSignatureTool />);
    await userEvent
      .setup()
      .upload(
        screen.getByLabelText('选择 PDF 文件'),
        new File(['%PDF-1.7'], 'signed.pdf', { type: 'application/pdf' }),
      );
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText(/未执行密码学验证/)).toBeInTheDocument();
    expect(screen.getByText('Example CA')).toBeInTheDocument();
  });
});
