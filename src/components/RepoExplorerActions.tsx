
import React from 'react';
import { FileText, List, RefreshCw, Sun, Moon } from 'lucide-react';

interface RepoExplorerActionsProps {
  fetchAllFiles: () => void;
  generateMarkdownDocument: () => void;
  clearCache: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  isLoadingAllFiles: boolean;
}

const RepoExplorerActions: React.FC<RepoExplorerActionsProps> = ({
  fetchAllFiles,
  generateMarkdownDocument,
  clearCache,
  toggleDarkMode,
  isDarkMode,
  isLoadingAllFiles,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold">ファイル構成</h2>
      <div className="flex space-x-2">
        <button 
          className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
          onClick={fetchAllFiles}
          disabled={isLoadingAllFiles}
          title="すべてのファイルを読み込み"
        >
          <List size={18} />
        </button>
        <button 
          className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
          onClick={generateMarkdownDocument}
          disabled={isLoadingAllFiles}
          title="マークダウンドキュメントとして表示"
        >
          <FileText size={18} />
        </button>
        <button
          onClick={clearCache}
          className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
          aria-label="Clear Cache"
          title="キャッシュをクリア"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
};

export default RepoExplorerActions;
