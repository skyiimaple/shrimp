import { useRef, useState } from 'react';
import { Card, ErrorBox, FileDropzone } from '../../components/ui';
import { inspectPdfSignatures, type PdfSignatureInspection } from '../lib/parity-pdf-signature';

export function PdfSignatureTool() {
  const [result, setResult] = useState<PdfSignatureInspection | null>(null);
  const [error, setError] = useState('');
  const generation = useRef(0);

  const inspect = async (file?: File) => {
    const current = ++generation.current;
    setResult(null);
    setError('');
    if (!file) return;
    try {
      const inspection = await inspectPdfSignatures(file);
      if (generation.current === current) setResult(inspection);
    } catch (reason) {
      if (generation.current === current)
        setError(reason instanceof Error ? reason.message : 'PDF 签名读取失败');
    }
  };

  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <FileDropzone
          ariaLabel="选择 PDF 文件"
          accept=".pdf,application/pdf"
          acceptLabel="PDF 文件（.pdf）"
          maxSizeLabel="最大 10 MB，不上传文件"
          onFile={inspect}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        <p>仅读取嵌入的签名证书信息；未执行密码学验证，也不判断证书信任或签名有效性。</p>
        {result &&
          (result.signatures.length === 0 ? (
            <p role="status">未检测到受支持的数字签名。</p>
          ) : (
            result.signatures.map((signature, index) => (
              <section key={index} className="grid gap-2">
                <h3>签名 {index + 1}</h3>
                {signature.certificates.map((certificate, certificateIndex) => (
                  <dl key={certificateIndex} className="grid gap-1">
                    <dt>{certificate.signer ? '签名者证书' : `证书 ${certificateIndex + 1}`}</dt>
                    <dd>
                      颁发给：<span>{certificate.subject}</span>
                    </dd>
                    <dd>
                      颁发者：<span>{certificate.issuer}</span>
                    </dd>
                    <dd>
                      证书标注有效期：{certificate.notBefore} 至 {certificate.notAfter}
                    </dd>
                  </dl>
                ))}
              </section>
            ))
          ))}
      </Card>
    </div>
  );
}
