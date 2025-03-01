import { useState, useEffect } from "react";
import { toast } from "sonner";
import RepoForm from "@/components/RepoForm";
import FileTree from "@/components/FileTree";
import IgnorePatterns from "@/components/IgnorePatterns";
import FileViewer from "@/components/FileViewer";
import RepoErrorDisplay from "@/components/RepoErrorDisplay";
import RepoExplorerActions from "@/components/RepoExplorerActions";
import { FileNode } from "@/lib/github/fileUtils";
import { 
  fetchRepoData, 
  fetchAllFilesContent, 
  fetchSingleFileContent, 
  clearCache as clearApiCache,
  RepoData
} from "@/services/GitHubService";
import { Clipboard, Download, Sun, Moon, RefreshCw } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [allFilesContent, setAllFilesContent] = useState<AllFilesContent>({});
  const [isLoadingAllFiles, setIsLoadingAllFiles] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    setMarkdownOutput("");
    setViewMode('single');
    setHasError(false);
    setErrorMessage("");
    
    if (!repoData) {
      toast.error("リポジトリデータがありません。");
      return;
    }

    // Use cached content if available
    if (allFilesContent[filePath]) {
      console.info("Using cached file content");
      
      let output = `# ${filePath}\n\n`;
      output += "```\n";
      output += allFilesContent[filePath];
      output += "\n```\n";
      
      if (sourceIgnorePatterns.length > 0) {
        const lines = output.split('\n');
        const filteredLines = lines.filter(line => {
          return !sourceIgnorePatterns.some(pattern => line.includes(pattern));
        });
        output = filteredLines.join('\n');
      }
      
      setMarkdownOutput(output);
      return;
    }

    try {
      const { content, error } = await fetchSingleFileContent(repoData, filePath, allFilesContent);
      
      if (error) {
        setHasError(true);
        setErrorMessage(error);
        toast.error(error);
        return;
      }
      
      // Update all files content with this new file
      const newContent = { ...allFilesContent };
      newContent[filePath] = content;
      setAllFilesContent(newContent);
      
      let output = `# ${filePath}\n\n`;
      output += "```\n";
      output += content;
      output += "\n```\n";
      
      if (sourceIgnorePatterns.length > 0) {
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
        errorMessage = error.message;
      }
      
      setHasError(true);
      setErrorMessage(errorMessage);
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
    setHasError(false);
    setErrorMessage("");

    try {
      const { allFilesContent: newAllFiles, error } = await fetchAllFilesContent(repoData, fileTree, allFilesContent);
      
      if (error) {
        setHasError(true);
        setErrorMessage(error);
      } else {
        setAllFilesContent(newAllFiles);
      }
    } catch (error) {
      console.error("Error fetching all files:", error);
      setHasError(true);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("すべてのファイルを取得できませんでした。");
      }
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

    fetchAllFiles();
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

  const handleSubmitRepo = async (repoUrl: string, maxDepth: number, ignorePatterns: string[]) => {
    setIsLoading(true);
    setRepoData(null);
    setFileTree(null);
    setSelectedFile(null);
    setMarkdownOutput("");
    setIgnorePatterns(ignorePatterns);
    setViewMode('all');
    setAllFilesContent({});
    setHasError(false);
    setErrorMessage("");
    
    try {
      const { repoData: newRepoData, fileTree: newFileTree, error } = await fetchRepoData(repoUrl, maxDepth, ignorePatterns);
      
      if (error) {
        setHasError(true);
        setErrorMessage(error);
      } else if (newRepoData && newFileTree) {
        setRepoData(newRepoData);
        setFileTree(newFileTree);
        
        // Automatically fetch all files when repository is loaded
        setTimeout(() => {
          fetchAllFiles();
        }, 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-6">sourcezen - GitHub リポジトリエクスプローラー</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={clearApiCache}
              className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              aria-label="Clear Cache"
              title="キャッシュをクリア"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        <RepoForm onSubmit={handleSubmitRepo} isLoading={isLoading} />
        
        {hasError && !fileTree && (
          <RepoErrorDisplay errorMessage={errorMessage} />
        )}
        
        {fileTree && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <RepoExplorerActions
                fetchAllFiles={fetchAllFiles}
                generateMarkdownDocument={generateMarkdownDocument}
                clearCache={clearApiCache}
                toggleDarkMode={toggleDarkMode}
                isDarkMode={isDarkMode}
                isLoadingAllFiles={isLoadingAllFiles}
              />
              
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
              
              <FileViewer
                viewMode={viewMode}
                selectedFile={selectedFile}
                markdownOutput={markdownOutput}
                allFilesContent={allFilesContent}
                isLoadingAllFiles={isLoadingAllFiles}
                hasError={hasError}
                errorMessage={errorMessage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
