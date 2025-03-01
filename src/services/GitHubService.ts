
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
const API_TIMEOUT = 120000; // 120秒に延長

// 同時リクエスト数の制限をさらに減らす
const MAX_CONCURRENT_REQUESTS = 1;

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

// ファイル取得用のキューシステム
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.runNext();
        }
      });
      
      // キューを処理
      if (this.running < this.maxConcurrent) {
        this.runNext();
      }
    });
  }

  private runNext() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        this.running++;
        task();
      }
    }
  }
}

// リクエストキューのインスタンスを作成
const requestQueue = new RequestQueue(MAX_CONCURRENT_REQUESTS);

// 未処理のリクエストを追跡するためのマップ
const pendingFetchRequests = new Map<string, Promise<any>>();

export const fetchRepoData = async (
  repoUrl: string, 
  maxDepth: number, 
  ignorePatterns: string[]
): Promise<{ repoData: RepoData | null; fileTree: any; error: string | null }> => {
  // ユニークなキャッシュキーを生成
  const cacheKey = `repo_${repoUrl}_${maxDepth}_${ignorePatterns.join('_')}`;
  
  // 進行中のリクエストがあればそれを再利用
  if (pendingFetchRequests.has(cacheKey)) {
    console.log("Reusing in-flight repo fetch request");
    return pendingFetchRequests.get(cacheKey);
  }
  
  const fetchPromise = (async () => {
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
      
      // レート制限エラーの詳細な処理
      if (errorMessage.includes('rate limit') || errorMessage.includes('レート制限')) {
        errorMessage = `GitHub APIのレート制限に達しました。環境変数 'VITE_GITHUB_TOKEN' に個人アクセストークンを設定することで制限を上げられます。\n詳細: ${errorMessage}`;
      }
      
      toast.error(errorMessage);
      return { repoData: null, fileTree: null, error: errorMessage };
    } finally {
      // 完了したらマップから削除
      pendingFetchRequests.delete(cacheKey);
    }
  })();
  
  // 進行中のリクエストとして保存
  pendingFetchRequests.set(cacheKey, fetchPromise);
  
  return fetchPromise;
};

// 既にファイルをフェッチ中かを追跡するためのマップ
const pendingFileContentRequests = new Map<string, Promise<any>>();

export const fetchAllFilesContent = async (
  repoData: RepoData,
  fileTree: any,
  currentFiles: Record<string, string> = {}
): Promise<{ allFilesContent: Record<string, string>; error: string | null }> => {
  // ユニークなキャッシュキーを生成
  const cacheKey = `files_${repoData?.url || 'unknown'}_${fileTree ? Object.keys(fileTree).length : 0}`;
  
  // 進行中のリクエストがあればそれを再利用
  if (pendingFileContentRequests.has(cacheKey)) {
    console.log("Reusing in-flight files fetch request");
    return pendingFileContentRequests.get(cacheKey);
  }
  
  const fetchPromise = (async () => {
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
      const filesToProcess = filePaths.filter(path => !isLikelyBinaryFile(path) && !currentFiles[path]);
      const totalFiles = filesToProcess.length;
      let lastProgressToast: string | null = null;
      
      const newAllFiles = { ...currentFiles };
      
      // バッチサイズを小さくして処理を分散
      const BATCH_SIZE = 5;
      for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
        const batch = filesToProcess.slice(i, i + BATCH_SIZE);
        
        // バッチ内のファイルを並列処理（並列数は制限付き）
        await Promise.all(
          batch.map(async (path) => {
            try {
              // ファイルパスごとのユニークなキャッシュキー
              const fileKey = `${repoData.owner}/${repoData.repo}/${path}`;
              
              // キューを使ってファイルコンテンツを取得（制限された並列度で）
              const content = await requestQueue.add(() => 
                withTimeout(
                  getFileContent(repoData, path, repoData.branch),
                  API_TIMEOUT / 2,
                  `ファイル「${path}」の取得に失敗しました`
                )
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
          })
        );
        
        // バッチ間に少し遅延を入れてレート制限に引っかかりにくくする
        if (i + BATCH_SIZE < filesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

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
      
      // レート制限エラーの詳細な処理
      if (errorMessage.includes('rate limit') || errorMessage.includes('レート制限')) {
        errorMessage = `GitHub APIのレート制限に達しました。環境変数 'VITE_GITHUB_TOKEN' に個人アクセストークンを設定することで制限を上げられます。または、しばらく時間をおいて再試行してください。`;
      }
      
      toast.error(errorMessage);
      return { allFilesContent: {}, error: errorMessage };
    } finally {
      // 完了したらマップから削除
      pendingFileContentRequests.delete(cacheKey);
    }
  })();
  
  // 進行中のリクエストとして保存
  pendingFileContentRequests.set(cacheKey, fetchPromise);
  
  return fetchPromise;
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
    
    // レート制限エラーの詳細な処理
    if (errorMessage.includes('rate limit') || errorMessage.includes('レート制限')) {
      errorMessage = `GitHub APIのレート制限に達しました。環境変数 'VITE_GITHUB_TOKEN' に個人アクセストークンを設定することで制限を上げられます。`;
    }
    
    return { content: "", error: errorMessage };
  }
};

export const clearCache = (): void => {
  clearApiCache();
  toast.success("キャッシュをクリアしました");
};
