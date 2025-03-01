
import { getDefaultBranch, getRepoTree, parseRepoUrl, getFileContent, clearApiCache } from "@/lib/github/api";
import { buildFileTree, isLikelyBinaryFile } from "@/lib/github/fileUtils";
import { toast } from "sonner";

export interface RepoData {
  url: string;
  owner: string;
  repo: string;
  branch: string;
}

// API呼び出しのタイムアウト設定（ミリ秒）
const API_TIMEOUT = 30000;

// タイムアウト付きのPromiseを作成する関数
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`${errorMessage} (${ms / 1000}秒でタイムアウトしました)`));
    }, ms);
  });

  return Promise.race([promise, timeout]);
};

export const fetchRepoData = async (
  repoUrl: string, 
  maxDepth: number, 
  ignorePatterns: string[]
): Promise<{ repoData: RepoData | null; fileTree: any; error: string | null }> => {
  try {
    console.info("Fetching repo data:", { repoUrl, ignorePatterns, maxDepth });
    
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      throw new Error("無効なリポジトリURLです。");
    }
    
    // タイムアウト付きでデフォルトブランチを取得
    toast.info("リポジトリの情報を取得中...");
    const defaultBranch = await withTimeout(
      getDefaultBranch(repoInfo),
      API_TIMEOUT,
      "リポジトリ情報の取得に失敗しました"
    );
    
    // タイムアウト付きでツリー構造を取得
    toast.info("ファイル構造を解析中...");
    const tree = await withTimeout(
      getRepoTree(repoInfo, defaultBranch, ignorePatterns),
      API_TIMEOUT,
      "ファイル構造の取得に失敗しました"
    );
    
    const root = buildFileTree(tree, ignorePatterns, maxDepth);
    
    const repoData = {
      url: repoUrl,
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      branch: defaultBranch,
    };
    
    toast.success("リポジトリデータを取得しました。");
    
    return { repoData, fileTree: root, error: null };
  } catch (error) {
    console.error("Error fetching repo data:", error);
    
    let errorMessage = "リポジトリデータの取得に失敗しました。";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
    return { repoData: null, fileTree: null, error: errorMessage };
  }
};

export const fetchAllFilesContent = async (
  repoData: RepoData,
  fileTree: any,
  currentFiles: Record<string, string> = {}
): Promise<{ allFilesContent: Record<string, string>; error: string | null }> => {
  try {
    if (!repoData || !fileTree) {
      throw new Error("リポジトリデータがありません。");
    }

    const getAllFilePaths = (node: any): string[] => {
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
    
    // 大量のファイルがある場合に警告
    if (filePaths.length > 100) {
      toast.warning(`${filePaths.length}個のファイルを処理します。時間がかかる場合があります。`);
    }
    
    // プログレス表示用のカウンター
    let processedCount = 0;
    const totalFiles = filePaths.filter(path => !isLikelyBinaryFile(path) && !currentFiles[path]).length;
    let lastProgressToast: string | null = null;
    
    const newAllFiles = { ...currentFiles };
    const fetchPromises = filePaths
      .filter(path => !isLikelyBinaryFile(path) && !newAllFiles[path])
      .map(async (path) => {
        try {
          // 個別のファイル取得にもタイムアウトを設定
          const content = await withTimeout(
            getFileContent(repoData, path, repoData.branch),
            API_TIMEOUT / 2, // 個別ファイルは短めのタイムアウト
            `ファイル「${path}」の取得に失敗しました`
          );
          
          newAllFiles[path] = content;
          
          // 進捗を更新
          processedCount++;
          const progress = Math.round((processedCount / totalFiles) * 100);
          
          // 10%刻みでトースト表示（前回と同じ場合は表示しない）
          const progressMessage = `ファイル読み込み中: ${progress}% (${processedCount}/${totalFiles})`;
          if (progress % 10 === 0 && progressMessage !== lastProgressToast) {
            toast.info(progressMessage);
            lastProgressToast = progressMessage;
          }
        } catch (error) {
          console.error(`Error fetching ${path}:`, error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          newAllFiles[path] = `// Error fetching file: ${errorMsg}`;
          processedCount++; // エラーでもカウントを進める
        }
      });

    // すべてのファイル取得が完了するかタイムアウトするまで待機
    await withTimeout(
      Promise.all(fetchPromises),
      API_TIMEOUT * 2, // 全体のタイムアウトは長め
      "ファイル取得処理がタイムアウトしました"
    );

    if (Object.keys(newAllFiles).length === 0) {
      throw new Error("ファイルを読み込めませんでした。URLを確認するか、別のリポジトリを試してください。");
    } else {
      toast.success(`${Object.keys(newAllFiles).length}個のファイルを読み込みました`);
    }
    
    return { allFilesContent: newAllFiles, error: null };
  } catch (error) {
    console.error("Error fetching all files:", error);
    
    let errorMessage = "すべてのファイルを取得できませんでした。";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
    return { allFilesContent: {}, error: errorMessage };
  }
};

export const fetchSingleFileContent = async (
  repoData: RepoData,
  filePath: string,
  allFilesContent: Record<string, string>
): Promise<{ content: string; error: string | null }> => {
  try {
    // Check if we already have this file in our cache
    if (allFilesContent[filePath]) {
      console.info("Using cached file content");
      return { content: allFilesContent[filePath], error: null };
    }
    
    // If not in cache, fetch it with timeout
    console.info("Fetching file content from API");
    const fileContent = await withTimeout(
      getFileContent(repoData, filePath, repoData.branch),
      API_TIMEOUT / 2,
      `ファイル「${filePath}」の取得がタイムアウトしました`
    );
    
    if (isLikelyBinaryFile(filePath)) {
      return { content: "Binary file cannot be displayed", error: null };
    }
    
    return { content: fileContent, error: null };
  } catch (error) {
    console.error("Error fetching file content:", error);
    
    let errorMessage = "ファイルコンテンツの取得に失敗しました。";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { content: "", error: errorMessage };
  }
};

export const clearCache = (): void => {
  clearApiCache();
  toast.success("キャッシュをクリアしました");
};
