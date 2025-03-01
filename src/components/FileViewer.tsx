
import React from 'react';
import { FileText, Clipboard, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface FileViewerProps {
  viewMode: 'single' | 'all';
  selectedFile: string | null;
  markdownOutput: string;
  allFilesContent: Record<string, string>;
  isLoadingAllFiles: boolean;
  hasError: boolean;
  errorMessage: string;
}

const FileViewer: React.FC<FileViewerProps> = ({
  viewMode,
  selectedFile,
  markdownOutput,
  allFilesContent,
  isLoadingAllFiles,
  hasError,
  errorMessage,
}) => {
  const copyToClipboard = () => {
    if (viewMode === 'single' && markdownOutput) {
      navigator.clipboard.writeText(markdownOutput)
        .then(() => toast.success("コードをクリップボードにコピーしました"))
        .catch(() => toast.error("コピーに失敗しました"));
    } else if (viewMode === 'all') {
      const allFilesText = Object.entries(allFilesContent)
        .map(([path, content]) => `# ${path}\n\n\`\`\`\n${content}\n\`\`\`\n\n`)
        .join('\n---\n\n');
      
      navigator.clipboard.writeText(allFilesText)
        .then(() => toast.success("すべてのファイルをクリップボードにコピーしました"))
        .catch(() => toast.error("コピーに失敗しました"));
    }
  };

  const downloadAsMarkdown = () => {
    let content = '';
    let filename = '';
    
    if (viewMode === 'single' && markdownOutput) {
      content = markdownOutput;
      filename = `${selectedFile?.split('/').pop() || 'file'}.md`;
    } else if (viewMode === 'all') {
      content = Object.entries(allFilesContent)
        .map(([path, fileContent]) => `# ${path}\n\n\`\`\`\n${fileContent}\n\`\`\`\n\n`)
        .join('\n---\n\n');
      filename = 'repository_files.md';
    }
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("マークダウンとしてダウンロードしました");
  };

  if (isLoadingAllFiles) {
    return (
      <div className="glass-panel p-6 text-center animate-fade-in">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          <p>ファイルを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center space-y-4 text-destructive">
          <FileText size={48} className="opacity-70" />
          <p className="text-center font-medium">{errorMessage}</p>
          {errorMessage.includes('レート制限') && (
            <div className="text-sm text-center max-w-md">
              <p className="mb-2">GitHub APIのレート制限に達しました。以下の方法で解決できます：</p>
              <ol className="list-decimal text-left ml-6 space-y-1">
                <li>しばらく待ってから再試行する</li>
                <li>GitHubの個人アクセストークンを使用する（環境変数 <code className="bg-muted px-1 py-0.5 rounded">VITE_GITHUB_TOKEN</code> に設定）</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-fade-in overflow-auto max-h-[80vh]">
      {Object.keys(allFilesContent).length > 0 ? (
        <div className="space-y-8">
          {viewMode === 'all' ? (
            Object.entries(allFilesContent).map(([path, content]) => (
              <div key={path} className="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  {path}
                </h3>
                <SyntaxHighlighter
                  style={dracula}
                  language={path.split('.').pop()}
                  customStyle={{ borderRadius: '0.5rem' }}
                >
                  {content}
                </SyntaxHighlighter>
              </div>
            ))
          ) : (
            selectedFile && (
              <div className="pb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  {selectedFile}
                </h3>
                <SyntaxHighlighter
                  style={dracula}
                  language={selectedFile.split('.').pop()}
                  customStyle={{ borderRadius: '0.5rem' }}
                >
                  {allFilesContent[selectedFile] || ''}
                </SyntaxHighlighter>
              </div>
            )
          )}
        </div>
      ) : markdownOutput ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ className, children, ...props }) {
              const match = (className || '').match(/language-(?<lang>.*)/);
              return match ? (
                <SyntaxHighlighter
                  style={dracula}
                  language={match.groups?.lang}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {markdownOutput}
        </ReactMarkdown>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <FileText size={48} className="opacity-50 mb-4" />
          <p>ファイルが読み込まれていません</p>
        </div>
      )}

      {(markdownOutput || Object.keys(allFilesContent).length > 0) && (
        <div className="flex justify-end mt-6 space-x-3">
          <button 
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
            onClick={copyToClipboard}
            title="コピー"
          >
            <Clipboard size={16} />
            <span>コピー</span>
          </button>
          <button 
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
            onClick={downloadAsMarkdown}
            title="ダウンロード"
          >
            <Download size={16} />
            <span>ダウンロード</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FileViewer;
