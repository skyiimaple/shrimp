import { useRef, useState } from 'react';
import { Card, ErrorBox, FileDropzone } from '../../components/ui';
import { fileToBase64 } from '../lib/parity-file-base64';
import { ToolResult } from './tool-panel-shared';

export function Base64FileTool() {
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const change = async (file?: File) => {
    const current = ++generation.current;
    setOutput('');
    setError('');
    if (!file) return;
    try {
      const result = await fileToBase64(file);
      if (generation.current === current) setOutput(result);
    } catch (reason) {
      if (generation.current === current)
        setError(reason instanceof Error ? reason.message : '文件转换失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <FileDropzone
          ariaLabel="选择文件"
          acceptLabel="所有文件"
          maxSizeLabel="最大 5 MB"
          onFile={change}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="Data URL" />
      </Card>
    </div>
  );
}
