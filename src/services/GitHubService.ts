
import { getDefaultBranch, getRepoTree, parseRepoUrl, getFileContent, clearApiCache } from "@/lib/github/api";
import { buildFileTree, isLikelyBinaryFile } from "@/lib/github/fileUtils";
import { toast } from "sonner";

export interface RepoData {
  url: string;
  owner: string;
  repo: string;
  branch: string;
}

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
    
    const defaultBranch = await getDefaultBranch(repoInfo);
    
    const tree = await getRepoTree(repoInfo, defaultBranch, ignorePatterns);
    
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
    
    const newAllFiles = { ...currentFiles };
    const fetchPromises = filePaths
      .filter(path => !isLikelyBinaryFile(path) && !newAllFiles[path])
      .map(async (path) => {
        try {
          const content = await getFileContent(repoData, path, repoData.branch);
          newAllFiles[path] = content;
        } catch (error) {
          console.error(`Error fetching ${path}:`, error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          newAllFiles[path] = `// Error fetching file: ${errorMsg}`;
        }
      });

    await Promise.all(fetchPromises);

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
    
    // If not in cache, fetch it
    console.info("Fetching file content from API");
    const fileContent = await getFileContent(
      repoData,
      filePath,
      repoData.branch
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
