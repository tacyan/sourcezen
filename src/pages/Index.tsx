
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
  FileProgressCallback,
  RepoData
} from "@/services/GitHubService";

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
  const [hasLoadedAllFiles, setHasLoadedAllFiles] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // プログレッシブローディング用のコールバック関数
  const handleFileProgress: FileProgressCallback = (
    filePath, 
    content, 
    processedCount, 
    totalCount
  ) => {
    setAllFilesContent(prev => ({
      ...prev,
      [filePath]: content
    }));
    setProcessedCount(processedCount);
    setTotalCount(totalCount);
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

    // If we haven't loaded all files yet and this file isn't in cache, try to fetch it individually
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

    // If we already have all files loaded, just display them without fetching again
    if (hasLoadedAllFiles && Object.keys(allFilesContent).length > 0) {
      setViewMode('all');
      toast.success("キャッシュからファイルを表示しています");
      return;
    }

    setIsLoadingAllFiles(true);
    setViewMode('all');
    setHasError(false);
    setErrorMessage("");
    setProcessedCount(0);
    setTotalCount(0);

    try {
      // プログレスコールバックを使用して徐々にファイルを表示
      fetchAllFilesContent(repoData, fileTree, allFilesContent, handleFileProgress)
        .then(({ allFilesContent: newAllFiles, error }) => {
          if (error) {
            setHasError(true);
            setErrorMessage(error);
          } else {
            setAllFilesContent(newAllFiles);
            setHasLoadedAllFiles(true);
            toast.success(`${Object.keys(newAllFiles).length}個のファイルを読み込みました`);
          }
          setIsLoadingAllFiles(false);
        });
    } catch (error) {
      console.error("Error fetching all files:", error);
      setHasError(true);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("すべてのファイルを取得できませんでした。");
      }
      toast.error("すべてのファイルを取得できませんでした。");
      setIsLoadingAllFiles(false);
    }
  };

  // マークダウンドキュメント生成機能 - すべてのファイルを一括取得して表示
  const generateMarkdownDocument = () => {
    if (!repoData || !fileTree) {
      toast.error("リポジトリデータがありません。");
      return;
    }

    setViewMode('all');
    setHasError(false);
    setErrorMessage("");
    
    // すでにキャッシュされている場合はそれを表示
    if (hasLoadedAllFiles && Object.keys(allFilesContent).length > 0) {
      toast.success(`${Object.keys(allFilesContent).length}個のファイルを表示します`);
      return;
    }
    
    // まだ読み込んでいない場合はプログレッシブローディングを開始
    setIsLoadingAllFiles(true);
    setProcessedCount(0);
    setTotalCount(0);

    // プログレスコールバックを使用してAPI呼び出し
    fetchAllFilesContent(repoData, fileTree, allFilesContent, handleFileProgress)
      .then(({ allFilesContent: newAllFiles, error }) => {
        if (error) {
          setHasError(true);
          setErrorMessage(error);
        } else {
          setAllFilesContent(newAllFiles);
          setHasLoadedAllFiles(true);
        }
        setIsLoadingAllFiles(false);
      })
      .catch(error => {
        console.error("Error in generateMarkdownDocument:", error);
        setHasError(true);
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("マークダウンドキュメントの生成に失敗しました。");
        }
        toast.error("マークダウンドキュメントの生成に失敗しました。");
        setIsLoadingAllFiles(false);
      });
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
    setHasLoadedAllFiles(false);
    setProcessedCount(0);
    setTotalCount(0);
    
    try {
      const { repoData: newRepoData, fileTree: newFileTree, error } = await fetchRepoData(repoUrl, maxDepth, ignorePatterns);
      
      if (error) {
        setHasError(true);
        setErrorMessage(error);
      } else if (newRepoData && newFileTree) {
        setRepoData(newRepoData);
        setFileTree(newFileTree);
        
        // リポジトリが読み込まれたら自動的にすべてのファイルを取得（プログレッシブに）
        toast.info("ファイルを読み込んでいます...");
        setIsLoadingAllFiles(true);
        
        // プログレスコールバックを使用してAPI呼び出し
        try {
          fetchAllFilesContent(newRepoData, newFileTree, {}, handleFileProgress)
            .then(({ allFilesContent: newAllFiles, error: filesError }) => {
              if (filesError) {
                setHasError(true);
                setErrorMessage(filesError);
              } else {
                setAllFilesContent(newAllFiles);
                setHasLoadedAllFiles(true);
              }
              setIsLoadingAllFiles(false);
            });
        } catch (fetchError) {
          console.error("Error auto-fetching all files:", fetchError);
          if (fetchError instanceof Error) {
            toast.error(fetchError.message);
          } else {
            toast.error("ファイルの自動取得に失敗しました");
          }
          setIsLoadingAllFiles(false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // キャッシュをクリアする関数を拡張
  const handleClearCache = () => {
    clearApiCache();
    setHasLoadedAllFiles(false); // ファイル読み込みフラグもリセット
    toast.success("キャッシュをクリアしました");
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-6">sourcezen - GitHub リポジトリエクスプローラー</h1>
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
                clearCache={handleClearCache}
                toggleDarkMode={toggleDarkMode}
                isDarkMode={isDarkMode}
                isLoadingAllFiles={isLoadingAllFiles}
                fileCount={Object.keys(allFilesContent).length}
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
              <FileViewer
                viewMode={viewMode}
                selectedFile={selectedFile}
                markdownOutput={markdownOutput}
                allFilesContent={allFilesContent}
                isLoadingAllFiles={isLoadingAllFiles}
                hasError={hasError}
                errorMessage={errorMessage}
                processedCount={processedCount}
                totalCount={totalCount}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
