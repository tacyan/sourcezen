
import { useState } from "react";
import { toast } from "sonner";
import RepoForm from "@/components/RepoForm";
import FileTree from "@/components/FileTree";
import IgnorePatterns from "@/components/IgnorePatterns";
import { FileNode, buildFileTree } from "@/lib/github/fileUtils";
import { getDefaultBranch, getRepoTree, parseRepoUrl } from "@/lib/github/api";
import { getFileContent } from "@/lib/github/api";
import { isLikelyBinaryFile } from "@/lib/github/fileUtils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getFileIconClass } from "@/lib/github/fileUtils";
import { FileText, FolderTree, List, Clipboard, Download, Sun, Moon } from "lucide-react";

interface RepoData {
  url: string;
  owner: string;
  repo: string;
  branch: string;
}

interface AllFilesContent {
  [path: string]: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [markdownOutput, setMarkdownOutput] = useState<string>("");
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>([]);
  const [sourceIgnorePatterns, setSourceIgnorePatterns] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [allFilesContent, setAllFilesContent] = useState<AllFilesContent>({});
  const [isLoadingAllFiles, setIsLoadingAllFiles] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    setMarkdownOutput("");
    setViewMode('single');
    
    if (!repoData) {
      toast.error("リポジトリデータがありません。");
      return;
    }
    
    try {
      console.info("Fetching file content:", { filePath });
      
      const fileContent = await getFileContent(
        repoData,
        filePath,
        repoData.branch
      );
      
      if (isLikelyBinaryFile(filePath)) {
        setMarkdownOutput("<p>このファイルはバイナリファイルである可能性が高いため、プレビューできません。</p>");
        return;
      }
      
      // Generate documentation markup for the file
      let output = `# ${filePath}\n\n`;
      output += "```\n";
      output += fileContent;
      output += "\n```\n";
      
      if (sourceIgnorePatterns.length > 0) {
        // Apply source ignore patterns if needed
        const lines = output.split('\n');
        const filteredLines = lines.filter(line => {
          return !sourceIgnorePatterns.some(pattern => line.includes(pattern));
        });
        output = filteredLines.join('\n');
      }
      
      setMarkdownOutput(output);
      toast.success("ファイルを読み込みました");
    } catch (error) {
      console.error("Error fetching file content:", error);
      
      let errorMessage = "ファイルコンテンツの取得に失敗しました。";
      
      if (error instanceof Error) {
        errorMessage += ` ${error.message}`;
        
        if (error.message.includes("404")) {
          errorMessage = "ファイルが見つかりませんでした。";
        }
        
        if (error.message.includes("401") || error.message.includes("403")) {
          errorMessage = "アクセス権限がありません。";
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const fetchAllFiles = async () => {
    if (!repoData || !fileTree) {
      toast.error("リポジトリデータがありません。");
      return;
    }

    setIsLoadingAllFiles(true);
    setViewMode('all');
    const allFiles: AllFilesContent = {};

    // Helper function to recursively get all file paths
    const getAllFilePaths = (node: FileNode): string[] => {
      const paths: string[] = [];
      if (node.type === 'file' && node.path) {
        return [node.path];
      }
      if (node.children) {
        for (const child of node.children) {
          paths.push(...getAllFilePaths(child));
        }
      }
      return paths;
    };

    const filePaths = getAllFilePaths(fileTree);
    
    try {
      // Use Promise.all to fetch all files in parallel
      await Promise.all(
        filePaths.map(async (path) => {
          if (!isLikelyBinaryFile(path)) {
            try {
              const content = await getFileContent(repoData, path, repoData.branch);
              // エンコーディングの問題を解決するためにデコード処理は行わない
              allFiles[path] = content;
            } catch (error) {
              console.error(`Error fetching ${path}:`, error);
              allFiles[path] = `// Error fetching file: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
        })
      );

      setAllFilesContent(allFiles);
      toast.success(`${Object.keys(allFiles).length}個のファイルを読み込みました`);
    } catch (error) {
      console.error("Error fetching all files:", error);
      toast.error("すべてのファイルを取得できませんでした。");
    } finally {
      setIsLoadingAllFiles(false);
    }
  };

  const generateMarkdownDocument = () => {
    if (!repoData || !fileTree) {
      toast.error("リポジトリデータがありません。");
      return;
    }

    setIsLoadingAllFiles(true);
    setViewMode('all');
    
    // Helper function to recursively get all file paths
    const getAllFilePaths = (node: FileNode): string[] => {
      const paths: string[] = [];
      if (node.type === 'file' && node.path) {
        return [node.path];
      }
      if (node.children) {
        for (const child of node.children) {
          paths.push(...getAllFilePaths(child));
        }
      }
      return paths;
    };

    const filePaths = getAllFilePaths(fileTree).filter(path => !isLikelyBinaryFile(path));
    
    // Sort files by path to group similar files together
    filePaths.sort();
    
    fetchAllFilesForMarkdown(filePaths);
  };

  const fetchAllFilesForMarkdown = async (filePaths: string[]) => {
    if (!repoData) return;
    
    const allFiles: AllFilesContent = {};
    
    try {
      // Use Promise.all to fetch all files in parallel
      await Promise.all(
        filePaths.map(async (path) => {
          try {
            const content = await getFileContent(repoData, path, repoData.branch);
            // 文字化けを防ぐために、生のコンテンツをそのまま使用
            allFiles[path] = content;
          } catch (error) {
            console.error(`Error fetching ${path}:`, error);
            allFiles[path] = `// Error fetching file: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        })
      );

      setAllFilesContent(allFiles);
      toast.success(`${Object.keys(allFiles).length}個のファイルを読み込みました`);
    } catch (error) {
      console.error("Error fetching all files:", error);
      toast.error("すべてのファイルを取得できませんでした。");
    } finally {
      setIsLoadingAllFiles(false);
    }
  };

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
      filename = `${repoData?.repo || 'repository'}_files.md`;
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

  const fetchRepoData = async (repoUrl: string, maxDepth: number, ignorePatterns: string[]) => {
    setIsLoading(true);
    setRepoData(null);
    setFileTree(null);
    setSelectedFile(null);
    setMarkdownOutput("");
    setIgnorePatterns(ignorePatterns);
    setViewMode('single');
    setAllFilesContent({});
    
    try {
      console.info("Fetching repo data:", { repoUrl, ignorePatterns, maxDepth });
      
      // Parse the repo URL to get owner and repo name
      const repoInfo = parseRepoUrl(repoUrl);
      if (!repoInfo) {
        throw new Error("無効なリポジトリURLです。");
      }
      
      // Get the default branch name
      const defaultBranch = await getDefaultBranch(repoInfo);
      
      // Get the repo file tree
      const tree = await getRepoTree(repoInfo, defaultBranch);
      
      // Build the file tree
      const root = buildFileTree(tree, ignorePatterns, maxDepth);
      
      setRepoData({
        url: repoUrl,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: defaultBranch,
      });
      
      setFileTree(root);
      
      toast.success("リポジトリデータを取得しました。");
    } catch (error) {
      console.error("Error fetching repo data:", error);
      
      // エラーメッセージをより詳細に表示
      let errorMessage = "リポジトリデータの取得に失敗しました。";
      
      if (error instanceof Error) {
        // エラーの詳細情報を追加
        errorMessage += ` ${error.message}`;
        
        // 404エラーの特別なケース
        if (error.message.includes("404")) {
          errorMessage = "リポジトリが見つかりませんでした。URLが正しいか確認してください。";
        }
        
        // 認証エラーの特別なケース
        if (error.message.includes("401") || error.message.includes("403")) {
          errorMessage = "アクセス権限がありません。プライベートリポジトリの場合は認証が必要です。";
        }
        
        // レート制限エラーの特別なケース
        if (error.message.includes("rate limit")) {
          errorMessage = "GitHub APIのレート制限に達しました。しばらく待ってから再試行してください。";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-6">GitHub リポジトリエクスプローラー</h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        
        <RepoForm onSubmit={fetchRepoData} isLoading={isLoading} />
        
        {fileTree && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">ファイル構成</h2>
                {repoData && (
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
                  </div>
                )}
              </div>
              
              <FileTree 
                tree={fileTree} 
                onSelect={handleFileSelect} 
                selectedFile={selectedFile}
              />
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">除外パターン</h3>
                <IgnorePatterns
                  ignorePatterns={ignorePatterns}
                  sourceIgnorePatterns={sourceIgnorePatterns}
                  onIgnorePatternsChange={setIgnorePatterns}
                  onSourceIgnorePatternsChange={setSourceIgnorePatterns}
                />
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {viewMode === 'single' ? 'ファイル内容' : 'すべてのファイル'}
                </h2>
                
                {(markdownOutput || Object.keys(allFilesContent).length > 0) && (
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
              
              {isLoadingAllFiles ? (
                <div className="glass-panel p-6 text-center animate-fade-in">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                    <p>ファイルを読み込み中...</p>
                  </div>
                </div>
              ) : viewMode === 'single' ? (
                markdownOutput ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 markdown-output animate-fade-in overflow-auto max-h-[80vh]">
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
                  </div>
                ) : (
                  <div className="glass-panel p-6 text-center animate-fade-in">
                    <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                      <FileText size={48} className="opacity-50" />
                      <p>ファイルを選択するとコンテンツが表示されます</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-fade-in overflow-auto max-h-[80vh]">
                  {Object.keys(allFilesContent).length > 0 ? (
                    <div className="space-y-8">
                      {Object.entries(allFilesContent).map(([path, content]) => (
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
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <FolderTree size={48} className="opacity-50 mb-4" />
                      <p>ファイルが読み込まれていません</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
