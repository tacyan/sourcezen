
import React from 'react';
import { FolderTree } from 'lucide-react';

interface RepoErrorDisplayProps {
  errorMessage: string;
}

const RepoErrorDisplay: React.FC<RepoErrorDisplayProps> = ({ errorMessage }) => {
  return (
    <div className="mt-8 p-6 border border-destructive/50 bg-destructive/10 rounded-lg">
      <h2 className="text-xl font-semibold text-destructive mb-2">エラーが発生しました</h2>
      <p className="text-destructive/90">{errorMessage}</p>
      <div className="mt-4">
        <p className="text-sm">
          GitHub APIのレート制限に達した場合は、GitHubの個人アクセストークンを使用すると制限を上げられます。
          環境変数 <code className="bg-muted px-1 py-0.5 rounded">VITE_GITHUB_TOKEN</code> にトークンを設定してください。
        </p>
      </div>
    </div>
  );
};

export default RepoErrorDisplay;
