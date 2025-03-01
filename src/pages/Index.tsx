import { useState } from "react";
import { toast } from "sonner";
import RepoForm from "@/components/RepoForm";
import FileTree from "@/components/FileTree";
import IgnorePatterns from "@/components/IgnorePatterns";
import { FileNode, buildFileTree } from "@/lib/github/fileUtils";
import { getDefaultBranch, getRepoTree, parseRepoUrl } from "@/lib/github/api";
import { generateMarkdownDocumentation } from "@/lib/markdown/generator";
import { getFileContent } from "@/lib/github/api";
import { isLikelyBinaryFile } from "@/lib/github/fileUtils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getFileIconClass } from "@/lib/github/fileUtils";

interface RepoData {
  url: string;
  owner: string;
  repo: string;
  branch: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [markdownOutput, setMarkdownOutput] = useState<string>("");
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>([]);
  const [sourceIgnorePatterns, setSourceIgnorePatterns] = useState<string[]>([]);

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    setMarkdownOutput("");
    
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
      
      const output = await generateMarkdownDocumentation(
        filePath,
        fileContent,
        sourceIgnorePatterns
      );
      
      setMarkdownOutput(output);
      toast.success("ドキュメントを生成しました。");
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

  const fetchRepoData = async (repoUrl: string, maxDepth: number, ignorePatterns: string[]) => {
    setIsLoading(true);
    setRepoData(null);
    setFileTree(null);
    setSelectedFile(null);
    setMarkdownOutput("");
    setIgnorePatterns(ignorePatterns);
    
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
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">GitHub Docs Generator</h1>
      
      <RepoForm onSubmit={fetchRepoData} isLoading={isLoading} />
      
      {fileTree && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">ファイル構成</h2>
            <FileTree 
              root={fileTree} 
              onFileSelect={handleFileSelect} 
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
            <h2 className="text-xl font-semibold mb-4">ドキュメント出力</h2>
            {markdownOutput ? (
              <div className="glass-panel p-6 markdown-output animate-fade-in">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = (className || '').match(/language-(?<lang>.*)/);
                      return !inline && match ? (
                        <SyntaxHighlighter
                          children={String(children).replace(/\n$/, '')}
                          style={dracula}
                          language={match.groups?.lang}
                          PreTag="div"
                          {...props}
                        />
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
                <p className="text-muted-foreground">
                  ファイルを選択するとドキュメントが生成されます
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
