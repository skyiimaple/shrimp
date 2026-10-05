import { useId, useState } from 'react';
import { FileUp, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FileDropzoneProps = {
  accept?: string;
  acceptLabel: string;
  ariaLabel: string;
  className?: string;
  maxSizeLabel?: string;
  onFile: (file?: File) => void;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  accept,
  acceptLabel,
  ariaLabel,
  className,
  maxSizeLabel,
  onFile,
}: FileDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File>();

  const selectFile = (file?: File) => {
    setSelectedFile(file);
    onFile(file);
  };

  return (
    <div className={cn('grid gap-3', className)} data-testid="file-dropzone">
      <label
        htmlFor={inputId}
        className={cn(
          'border-border bg-muted/20 text-muted-foreground hover:border-primary hover:bg-primary/5 focus-within:border-primary focus-within:ring-ring/30 grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition focus-within:ring-2',
          isDragging && 'border-primary bg-primary/10',
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          selectFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          id={inputId}
          aria-label={ariaLabel}
          className="sr-only"
          type="file"
          accept={accept}
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <span className="grid justify-items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-12 place-items-center rounded-full">
            {selectedFile ? (
              <FileUp aria-hidden="true" size={22} />
            ) : (
              <UploadCloud aria-hidden="true" size={22} />
            )}
          </span>
          <span className="text-foreground text-sm font-semibold">
            {selectedFile ? selectedFile.name : '点击或拖拽上传文件'}
          </span>
          <span className="text-muted-foreground text-xs">
            {selectedFile
              ? `${formatFileSize(selectedFile.size)} · 点击或拖拽更换文件`
              : '支持点击选择或直接拖入文件'}
          </span>
        </span>
      </label>
      <p className="text-muted-foreground text-xs">
        支持：{acceptLabel}
        {maxSizeLabel ? ` · ${maxSizeLabel}` : ''}
      </p>
    </div>
  );
}
