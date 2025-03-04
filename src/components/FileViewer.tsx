
import React from 'react';
import { FileText, Clipboard, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface FileViewerProps {
  viewMode: 'single' | 'all';
  selectedFile: string | null;
  markdownOutput: string;
  allFilesContent: Record<string, string>;
  isLoadingAllFiles: boolean;
  hasError: boolean;
  errorMessage: string;
  processedCount?: number;
  totalCount?: number;
  repoName?: string; // 追加: リポジトリ名
}

const FileViewer: React.FC<FileViewerProps> = ({
  viewMode,
  selectedFile,
  markdownOutput,
  allFilesContent,
  isLoadingAllFiles,
  hasError,
  errorMessage,
  processedCount = 0,
  totalCount = 0,
  repoName = 'repository', // デフォルト値を設定
}) => {
  const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'sh': 'bash',
      'bash': 'bash',
      'txt': 'text',
    };
    
    return langMap[extension] || extension || 'text';
  };

  const copyToClipboard = () => {
    if (viewMode === 'single' && markdownOutput) {
      navigator.clipboard.writeText(markdownOutput)
        .then(() => toast.success("コードをクリップボードにコピーしました"))
        .catch(() => toast.error("コピーに失敗しました"));
    } else if (viewMode === 'all') {
      const allFilesText = Object.entries(allFilesContent)
        .map(([path, content]) => `# ${path}\n\n\`\`\`${getLanguageFromPath(path)}\n${content}\n\`\`\`\n\n`)
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
        .map(([path, fileContent]) => {
          const lang = getLanguageFromPath(path);
          return `# ${path}\n\n\`\`\`${lang}\n${fileContent}\n\`\`\`\n\n`;
        })
        .join('\n---\n\n');
      // リポジトリ名を使用してファイル名を作成
      filename = `${repoName}_files.md`;
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

  const renderProgressBar = () => {
    const progressPercent = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;
    
    return (
      <div className="w-full space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {processedCount} / {totalCount} ファイル ({Math.round(progressPercent)}%)
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
    );
  };

  const renderAllFiles = () => {
    const files = Object.entries(allFilesContent);
    if (files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <FileText size={48} className="opacity-50 mb-4" />
          <p>ファイルが読み込まれていません</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {files.map(([path, content]) => (
          <div key={path} className="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              {path}
            </h3>
            <SyntaxHighlighter
              style={dracula}
              language={getLanguageFromPath(path)}
              customStyle={{ borderRadius: '0.5rem' }}
            >
              {content}
            </SyntaxHighlighter>
          </div>
        ))}
      </div>
    );
  };

  const renderActionButtons = () => {
    if (markdownOutput || Object.keys(allFilesContent).length > 0) {
      return (
        <div className="flex justify-end mb-4 space-x-3">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={copyToClipboard}
            title="コピー"
          >
            <Clipboard size={16} />
            <span>コピー</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={downloadAsMarkdown}
            title="ダウンロード"
          >
            <Download size={16} />
            <span>ダウンロード</span>
          </Button>
        </div>
      );
    }
    return null;
  };

  if (isLoadingAllFiles) {
    return (
      <div className="glass-panel p-6 text-center animate-fade-in">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full">
            <Loader2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div>
            <p className="font-medium">ファイルを読み込み中...</p>
            <p className="text-sm text-muted-foreground mt-1">大きなリポジトリの場合は時間がかかることがあります</p>
          </div>
          
          {/* プログレスバーを表示 */}
          {totalCount > 0 && renderProgressBar()}
          
          {/* 既に読み込んだファイルがある場合は、それらを表示 */}
          {Object.keys(allFilesContent).length > 0 && (
            <div className="mt-4 w-full space-y-4">
              <h4 className="text-lg font-medium text-left">読み込み済みファイル:</h4>
              <div className="max-h-[400px] overflow-auto w-full">
                {renderAllFiles()}
              </div>
            </div>
          )}
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
      {viewMode === 'all' && renderActionButtons()}
      
      {viewMode === 'all' && Object.keys(allFilesContent).length > 0 ? (
        renderAllFiles()
      ) : viewMode === 'single' && selectedFile && allFilesContent[selectedFile] ? (
        <div className="pb-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            {selectedFile}
          </h3>
          <SyntaxHighlighter
            style={dracula}
            language={getLanguageFromPath(selectedFile)}
            customStyle={{ borderRadius: '0.5rem' }}
          >
            {allFilesContent[selectedFile] || ''}
          </SyntaxHighlighter>
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

      {viewMode === 'single' && renderActionButtons()}
    </div>
  );
};

export default FileViewer;
