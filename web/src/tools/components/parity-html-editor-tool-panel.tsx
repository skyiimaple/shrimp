import { useRef, useState } from 'react';
import { Card, SecondaryButton } from '../../components/ui';
import { sanitizeEditorHtml } from '../lib/parity-html-editor';
import { ToolResult } from './tool-panel-shared';

export function HtmlEditorTool() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState('');
  const sync = () => setHtml(sanitizeEditorHtml(editorRef.current?.innerHTML ?? ''));
  const format = (command: 'bold' | 'italic' | 'insertUnorderedList') => {
    editorRef.current?.focus();
    document.execCommand(command);
    sync();
  };
  const pastePlainText = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const plainText = event.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const node = document.createTextNode(plainText);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    sync();
  };
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <p className="text-muted-foreground text-sm">
          在编辑区输入文字；粘贴内容按纯文本处理，输出 HTML 会清理脚本和危险属性。
        </p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => format('bold')}
          >
            加粗
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => format('italic')}
          >
            斜体
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => format('insertUnorderedList')}
          >
            列表
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onClick={() => {
              if (editorRef.current) editorRef.current.innerHTML = '';
              setHtml('');
            }}
          >
            清空
          </SecondaryButton>
        </div>
        <div
          ref={editorRef}
          aria-label="可视化编辑区"
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onPaste={pastePlainText}
          onDrop={(event) => event.preventDefault()}
          className="border-border bg-background focus-visible:ring-ring min-h-44 rounded-xl border p-3 text-sm leading-6 focus-visible:ring-2 focus-visible:outline-none"
        />
      </Card>
      <Card>
        <ToolResult value={html} label="HTML 源码" />
      </Card>
    </div>
  );
}
