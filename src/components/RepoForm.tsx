
import { useState } from 'react';
import { Github, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { parseRepoUrl } from '@/lib/github/api';

interface RepoFormProps {
  onSubmit: (repoUrl: string, maxDepth: number, ignorePatterns: string[]) => void;
  isLoading: boolean;
}

const RepoForm = ({ onSubmit, isLoading }: RepoFormProps) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(5);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState('');
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>([
    // デフォルトの除外パターン
    'node_modules/',
    '.git/',
    '.github/',
    'dist/',
    'build/',
    // 追加の除外パターン
    'out/',
    '.next/',
    '.nuxt/',
    '.output/',
    '.pnp/',
    '.pnp.js',
    'vendor/',
    '.venv/',
    'venv/',
    'env/',
    '.env/',
    'pip-wheel-metadata/',
    '.cache/',
    '.eslintcache',
    '.stylelintcache',
    '.parcel-cache',
    '.rts2_cache_*/',
    '.rts2_cache/',
    '.npm/',
    '.yarn/',
    '.pnpm/',
    'logs/',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'pnpm-debug.log*',
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    '.idea/',
    '.vscode/',
    '.vs/',
    '*.sublime-*',
    '*.swp',
    '*.swo',
    '.DS_Store',
    'Thumbs.db',
    'coverage/',
    '.nyc_output/',
    '.jest/',
    '.cypress/',
    'cypress/videos/',
    'cypress/screenshots/',
    '*.exe',
    '*.dll',
    '*.so',
    '*.dylib',
    '*.bin',
    '*.obj',
    '*.o',
    '*.a',
    '*.lib',
    '*.out',
    '*.app',
    '.gitlab/',
    '.circleci/',
    '.travis.yml',
    'LICENSE',
    'LICENSE.*',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'SECURITY.md',
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repoUrl.trim()) {
      setError('リポジトリURLを入力してください');
      return;
    }
    
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      setError('無効なGitHub URLです');
      return;
    }
    
    setError('');
    onSubmit(repoUrl, maxDepth, ignorePatterns);
  };

  const handleMaxDepthChange = (newValue: number) => {
    setMaxDepth(newValue);
  };

  const addIgnorePattern = (pattern: string) => {
    if (pattern && !ignorePatterns.includes(pattern)) {
      setIgnorePatterns([...ignorePatterns, pattern]);
    }
  };

  const removeIgnorePattern = (pattern: string) => {
    setIgnorePatterns(ignorePatterns.filter(p => p !== pattern));
  };

  return (
    <div className="glass-panel p-6 animate-fade-in">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Github size={20} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              className={`w-full pl-10 pr-4 py-3 rounded-md border transitions-all ${
                error ? 'border-destructive' : 'border-input'
              } focus:outline-none focus:ring-2 focus:ring-ring bg-card`}
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-destructive text-sm mt-1">{error}</p>}
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-opacity-90 transitions-all flex items-center justify-center disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <RefreshCw size={18} className="mr-2 animate-spin" />
                <span>解析中...</span>
              </>
            ) : (
              <span>ドキュメント生成</span>
            )}
          </button>
        </div>
        
        <div className="mt-4">
          <button
            type="button"
            className="text-sm flex items-center text-muted-foreground hover:text-foreground transitions-all"
            onClick={() => setShowOptions(!showOptions)}
          >
            {showOptions ? (
              <ChevronUp size={16} className="mr-1" />
            ) : (
              <ChevronDown size={16} className="mr-1" />
            )}
            詳細オプション
          </button>
          
          {showOptions && (
            <div className="mt-4 p-4 bg-card rounded-md border border-border animate-slide-in">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  ディレクトリ深度 ({maxDepth === -1 ? '制限なし' : maxDepth})
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center bg-secondary rounded-md"
                    onClick={() => handleMaxDepthChange(Math.max(1, maxDepth - 1))}
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="-1"
                    max="10"
                    value={maxDepth}
                    onChange={(e) => handleMaxDepthChange(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center bg-secondary rounded-md"
                    onClick={() => handleMaxDepthChange(maxDepth === -1 ? 1 : Math.min(10, maxDepth + 1))}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="text-sm bg-secondary px-2 py-1 rounded-md"
                    onClick={() => handleMaxDepthChange(-1)}
                  >
                    制限なし
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  除外パターン
                </label>
                <div className="flex flex-wrap gap-2 mt-2 mb-3">
                  {ignorePatterns.map((pattern, index) => (
                    <div key={index} className="inline-flex items-center bg-secondary rounded-full px-3 py-1 text-sm">
                      <span>{pattern}</span>
                      <button 
                        type="button" 
                        className="ml-2 text-muted-foreground hover:text-destructive transitions-all"
                        onClick={() => removeIgnorePattern(pattern)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="除外するファイル/ディレクトリパターン"
                    className="flex-1 px-3 py-2 border border-input rounded-l-md focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIgnorePattern(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="bg-primary text-primary-foreground px-3 py-2 rounded-r-md"
                    onClick={(e) => {
                      const input = e.currentTarget.previousSibling as HTMLInputElement;
                      addIgnorePattern(input.value);
                      input.value = '';
                    }}
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default RepoForm;
