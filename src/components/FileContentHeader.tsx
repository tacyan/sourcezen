
import React from 'react';
import { Clipboard, Download } from 'lucide-react';

interface FileContentHeaderProps {
  viewMode: 'single' | 'all';
  hasContent: boolean;
  copyToClipboard: () => void;
  downloadAsMarkdown: () => void;
}

const FileContentHeader: React.FC<FileContentHeaderProps> = ({
  viewMode,
  hasContent,
  copyToClipboard,
  downloadAsMarkdown,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold">
        {viewMode === 'single' ? 'ファイル内容' : 'すべてのファイル'}
      </h2>
      
      {hasContent && (
        <div className="flex space-x-3">
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

export default FileContentHeader;
