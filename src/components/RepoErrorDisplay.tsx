
import React from 'react';
import { FolderTree, AlertCircle } from 'lucide-react';

interface RepoErrorDisplayProps {
  errorMessage: string;
}

const RepoErrorDisplay: React.FC<RepoErrorDisplayProps> = ({ errorMessage }) => {
  const isTimeoutError = errorMessage.includes('タイムアウト') || errorMessage.includes('timeout');
  const isRateLimitError = errorMessage.includes('レート制限') || errorMessage.includes('rate limit');

  return (
    <div className="mt-8 p-6 border border-destructive/50 bg-destructive/10 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xl font-semibold text-destructive mb-2">エラーが発生しました</h2>
          <p className="text-destructive/90 mb-4">{errorMessage}</p>

          {isTimeoutError && (
            <div className="bg-background/80 p-4 rounded-md text-sm">
              <p className="font-medium mb-2">考えられる解決策:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>より小さなリポジトリを試してください</li>
                <li>無視パターンをさらに追加して、処理対象のファイルを減らしてください</li>
                <li>最大深度を制限して、より少ないファイルを読み込むようにしてください</li>
              </ul>
            </div>
          )}

          {isRateLimitError && (
            <div className="bg-background/80 p-4 rounded-md text-sm">
              <p className="font-medium mb-2">GitHubのレート制限に達しました:</p>
              <p className="mb-2">
                GitHubの個人アクセストークンを使用すると制限を上げられます。
                環境変数 <code className="bg-muted px-1 py-0.5 rounded">VITE_GITHUB_TOKEN</code> にトークンを設定してください。
              </p>
              <p className="text-xs opacity-80">
                トークンの作成方法: GitHub Settings → Developer settings → Personal access tokens
              </p>
            </div>
          )}

          {!isTimeoutError && !isRateLimitError && (
            <div className="bg-background/80 p-4 rounded-md text-sm">
              <p className="font-medium mb-2">一般的な解決策:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>URLが正しいことを確認してください</li>
                <li>リポジトリが公開されていることを確認してください</li>
                <li>ネットワーク接続を確認してください</li>
                <li>キャッシュをクリアして再試行してください</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepoErrorDisplay;
