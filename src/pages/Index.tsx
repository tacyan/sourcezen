
import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Copy, Download, Github, RefreshCw } from 'lucide-react';
import RepoForm from '@/components/RepoForm';
import FileTree from '@/components/FileTree';
import IgnorePatterns from '@/components/IgnorePatterns';
import { FileNode } from '@/lib/github/fileUtils';
import { parseRepoUrl } from '@/lib/github/api';

interface RepoInfo {
  owner: string;
  repo: string;
}

interface RepositoryData {
  repoInfo: RepoInfo;
  defaultBranch: string;
  fileTree: FileNode;
}

const Index = () => {
  const { toast } = useToast();
  const [repoData, setRepoData] = useState<RepositoryData | null>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>([
    'node_modules/', '.git/', '.github/', 'dist/', 'build/'
  ]);
  const [sourceIgnorePatterns, setSourceIgnorePatterns] = useState<string[]>([
    'TODO:', 'FIXME:', 'DEBUG:'
  ]);

  const fetchRepoData = async (repoUrl: string, maxDepth: number) => {
    setLoading(true);
    setRepoData(null);
    setMarkdown('');
    
    try {
      console.log('Fetching repo data:', { repoUrl, ignorePatterns, maxDepth });
      
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          ignorePatterns,
          maxDepth
        }),
      });
      
      if (!response.ok) {
        let errorMessage = 'リポジトリデータの取得に失敗しました';
        
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the JSON, use the status text
          errorMessage = `エラー: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Repo data fetched successfully:', data);
      setRepoData(data);
      
      // Automatically generate markdown after fetching repo data
      if (data && data.repoInfo && data.defaultBranch) {
        generateMarkdown(repoUrl, data.defaultBranch);
      }
    } catch (error) {
      console.error('Error fetching repo data:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMarkdown = async (repoUrl: string, branch: string) => {
    if (!repoUrl) return;
    
    setGenerating(true);
    
    try {
      console.log('Generating markdown:', { repoUrl, branch, ignorePatterns, sourceIgnorePatterns });
      
      const response = await fetch('/api/github/markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          ignorePatterns,
          sourceIgnorePatterns,
          maxDepth: -1,
          format: 'markdown'
        }),
      });
      
      if (!response.ok) {
        let errorMessage = 'マークダウンの生成に失敗しました';
        
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the JSON, use the status text
          errorMessage = `エラー: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Markdown generated successfully');
      setMarkdown(data.markdown);
    } catch (error) {
      console.error('Error generating markdown:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleFileSelect = async (node: FileNode) => {
    setSelectedNode(node);
    
    if (node.type === 'file' && repoData) {
      // Fetch file content if it's a file
      try {
        const response = await fetch('/api/github/file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repoUrl: `https://github.com/${repoData.repoInfo.owner}/${repoData.repoInfo.repo}`,
            filePath: node.path,
            branch: repoData.defaultBranch,
            sourceIgnorePatterns
          }),
        });
        
        if (!response.ok) {
          throw new Error('ファイル内容の取得に失敗しました');
        }
        
        const data = await response.json();
        // Do something with file content
        console.log(data);
      } catch (error) {
        toast({
          title: "エラー",
          description: error instanceof Error ? error.message : '不明なエラーが発生しました',
          variant: "destructive",
        });
      }
    }
  };

  const copyToClipboard = () => {
    if (!markdown) return;
    
    navigator.clipboard.writeText(markdown).then(
      () => {
        toast({
          title: "コピー完了",
          description: "マークダウンをクリップボードにコピーしました",
        });
      },
      () => {
        toast({
          title: "エラー",
          description: "クリップボードへのコピーに失敗しました",
          variant: "destructive",
        });
      }
    );
  };

  const downloadMarkdown = () => {
    if (!markdown || !repoData) return;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoData.repoInfo.repo}-docs.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "ダウンロード完了",
      description: `${repoData.repoInfo.repo}-docs.md をダウンロードしました`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">Markdown Magic Machine</h1>
          <p className="text-xl text-muted-foreground">
            GitHubリポジトリからマークダウンドキュメントを自動生成
          </p>
        </div>
        
        <div className="grid gap-8">
          <RepoForm onSubmit={fetchRepoData} isLoading={loading} />
          
          {repoData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-8">
                <div className="glass-panel p-4 animate-fade-in">
                  <h3 className="font-semibold mb-3">リポジトリ情報</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Github size={16} className="mr-2" />
                      <a 
                        href={`https://github.com/${repoData.repoInfo.owner}/${repoData.repoInfo.repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline"
                      >
                        {repoData.repoInfo.owner}/{repoData.repoInfo.repo}
                      </a>
                    </div>
                    <p className="text-sm">ブランチ: {repoData.defaultBranch}</p>
                  </div>
                </div>
                
                <FileTree 
                  tree={repoData.fileTree}
                  onSelect={handleFileSelect}
                />
                
                <IgnorePatterns
                  ignorePatterns={ignorePatterns}
                  sourceIgnorePatterns={sourceIgnorePatterns}
                  onIgnorePatternsChange={setIgnorePatterns}
                  onSourceIgnorePatternsChange={setSourceIgnorePatterns}
                />
                
                <div className="glass-panel p-4 animate-fade-in">
                  <h3 className="font-semibold mb-3">ドキュメント生成</h3>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => generateMarkdown(
                        `https://github.com/${repoData.repoInfo.owner}/${repoData.repoInfo.repo}`,
                        repoData.defaultBranch
                      )}
                      variant="default"
                      disabled={generating}
                      className="w-full"
                    >
                      {generating ? (
                        <>
                          <RefreshCw size={16} className="mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        "マークダウン再生成"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div className="glass-panel p-4 h-full animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">マークダウン出力</h3>
                    <div className="flex space-x-2">
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        size="sm"
                        disabled={!markdown}
                      >
                        <Copy size={16} className="mr-2" />
                        コピー
                      </Button>
                      <Button
                        onClick={downloadMarkdown}
                        variant="outline"
                        size="sm"
                        disabled={!markdown}
                      >
                        <Download size={16} className="mr-2" />
                        ダウンロード
                      </Button>
                    </div>
                  </div>
                  
                  {generating ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <RefreshCw size={36} className="animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">マークダウン生成中...</p>
                      </div>
                    </div>
                  ) : markdown ? (
                    <div className="markdown-output border rounded-md p-4 bg-card h-[calc(100vh-300px)] overflow-auto">
                      <pre className="text-sm whitespace-pre-wrap">{markdown}</pre>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 border rounded-md border-dashed">
                      <div className="text-center">
                        <p className="text-muted-foreground">マークダウンがまだ生成されていません</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
