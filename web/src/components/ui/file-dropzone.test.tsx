import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileDropzone } from './file-dropzone';

describe('FileDropzone', () => {
  it('renders upload guidance and reports selected files', () => {
    const onFile = vi.fn();
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    render(
      <FileDropzone
        ariaLabel="选择文件"
        acceptLabel="所有文件"
        maxSizeLabel="最大 5 MB"
        onFile={onFile}
      />,
    );

    expect(screen.getByText('点击或拖拽上传文件')).toBeInTheDocument();
    expect(screen.getByText('支持：所有文件 · 最大 5 MB')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('选择文件'), { target: { files: [file] } });

    expect(onFile).toHaveBeenCalledWith(file);
    expect(screen.getByText('hello.txt')).toBeInTheDocument();
    expect(screen.getByText(/5 B/)).toBeInTheDocument();
  });

  it('reports a file dropped into the zone', () => {
    const onFile = vi.fn();
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });

    render(
      <FileDropzone
        ariaLabel="选择 PDF 文件"
        accept=".pdf,application/pdf"
        acceptLabel="PDF 文件（.pdf）"
        onFile={onFile}
      />,
    );

    fireEvent.drop(screen.getByText('点击或拖拽上传文件').closest('label') as HTMLElement, {
      dataTransfer: { files: [file] },
    });

    expect(onFile).toHaveBeenCalledWith(file);
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });
});
