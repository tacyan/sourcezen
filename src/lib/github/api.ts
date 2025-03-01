
/**
 * GitHub API utilities
 * 
 * This module provides functions for interacting with the GitHub API
 * to fetch repository information and file contents.
 */

interface RepoInfo {
  owner: string;
  repo: string;
}

interface RepositoryInfo {
  name: string;
  full_name: string;
  description: string;
  owner: {
    login: string;
    avatar_url: string;
    url: string;
  };
  html_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  license?: {
    name: string;
  };
  created_at: string;
  updated_at: string;
  default_branch: string;
}

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

interface TreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  url: string;
}

// Common directories and files to ignore by default
const DEFAULT_IGNORE_PATTERNS = [
  '.git', 
  'node_modules', 
  '.DS_Store', 
  'dist', 
  'build',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
  'coverage'
];

// Cache for API responses to reduce GitHub API calls
const apiCache: Record<string, {
  data: any;
  timestamp: number;
}> = {};

// Cache expiration time (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

/**
 * Parses a GitHub repository URL to extract owner and repo name
 * 
 * @param url - GitHub repository URL
 * @returns Repository information object or null if URL is invalid
 */
export function parseRepoUrl(url: string): RepoInfo | null {
  // GitHub URL patterns:
  // - https://github.com/owner/repo
  // - https://github.com/owner/repo.git
  // - git@github.com:owner/repo.git
  
  let match;
  
  // Handle https://github.com/owner/repo or https://github.com/owner/repo.git
  match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)(\.git)?$/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    };
  }
  
  // Handle git@github.com:owner/repo.git
  match = url.match(/github\.com:([^\/]+)\/([^\/\.]+)(\.git)?$/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    };
  }
  
  return null;
}

/**
 * Checks if a file or directory should be ignored based on patterns
 * 
 * @param path - File or directory path
 * @param ignorePatterns - Array of patterns to ignore
 * @returns Boolean indicating if the path should be ignored
 */
export function shouldIgnorePath(path: string, ignorePatterns: string[] = []): boolean {
  // Always check against default ignore patterns
  const patterns = [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns];
  
  // Check if path starts with or contains any ignore pattern
  for (const pattern of patterns) {
    // Direct match
    if (path === pattern) {
      return true;
    }
    
    // Check if the path is a subdirectory of the pattern
    if (path.startsWith(`${pattern}/`)) {
      return true;
    }
    
    // Check if path contains the pattern as a directory
    if (path.includes(`/${pattern}/`)) {
      return true;
    }
    
    // Check with * wildcard (simple implementation)
    if (pattern.includes('*')) {
      const regex = new RegExp(
        pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
      );
      if (regex.test(path)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Fetches a GitHub API URL with proper authentication if available
 * 
 * @param url - GitHub API URL
 * @returns Response from GitHub API
 */
async function fetchGitHubApi(url: string): Promise<any> {
  // Check cache first
  if (apiCache[url] && Date.now() - apiCache[url].timestamp < CACHE_EXPIRATION) {
    console.log("Using cached data for:", url);
    return apiCache[url].data;
  }

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  // If using a GitHub token (for higher rate limits)
  // Viteでは環境変数はimport.meta.envとして提供される
  const token = import.meta.env.VITE_GITHUB_TOKEN || '';
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    // More detailed error handling
    let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
    
    // Specific error messages based on status code
    if (response.status === 404) {
      errorMessage = `リポジトリまたはファイルが見つかりません (404)。URLを確認してください。`;
    } else if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      if (rateLimitRemaining === '0') {
        errorMessage = `GitHub APIのレート制限に達しました (403)。環境変数 'VITE_GITHUB_TOKEN' に個人アクセストークンを設定することで制限を上げられます。`;
      } else {
        errorMessage = `アクセス権限がありません (403)。プライベートリポジトリには認証が必要です。`;
      }
    } else if (response.status === 401) {
      errorMessage = `認証エラー (401)。GitHubトークンが無効または期限切れです。`;
    }

    throw new Error(errorMessage);
  }
  
  // Cache the successful response
  const data = await response.json();
  apiCache[url] = {
    data,
    timestamp: Date.now()
  };
  
  return data;
}

/**
 * Gets the default branch for a repository
 * 
 * @param repoInfo - Repository information
 * @returns Default branch name
 */
export async function getDefaultBranch(repoInfo: RepoInfo): Promise<string> {
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
  const data = await fetchGitHubApi(url);
  return data.default_branch;
}

/**
 * Gets detailed repository information
 * 
 * @param repoUrl - Repository URL
 * @returns Repository details
 */
export async function getRepositoryInfo(repoUrl: string): Promise<RepositoryInfo> {
  const repoInfo = parseRepoUrl(repoUrl);
  if (!repoInfo) {
    throw new Error('Invalid GitHub URL');
  }
  
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
  return await fetchGitHubApi(url);
}

/**
 * Gets repository contributors
 * 
 * @param repoUrl - Repository URL
 * @param limit - Maximum number of contributors to fetch
 * @returns List of contributors
 */
export async function getRepositoryContributors(repoUrl: string, limit: number = 10): Promise<Contributor[]> {
  const repoInfo = parseRepoUrl(repoUrl);
  if (!repoInfo) {
    throw new Error('Invalid GitHub URL');
  }
  
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contributors?per_page=${limit}`;
  return await fetchGitHubApi(url);
}

/**
 * Gets repository tree (file structure)
 * 
 * @param repoInfo - Repository information
 * @param branch - Branch name
 * @param ignorePatterns - Patterns to ignore (like .gitignore)
 * @returns Repository tree with ignored files removed
 */
export async function getRepoTree(
  repoInfo: RepoInfo, 
  branch: string,
  ignorePatterns: string[] = []
): Promise<TreeItem[]> {
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${branch}?recursive=1`;
  const data = await fetchGitHubApi(url);
  
  // Filter out ignored files and directories
  return data.tree.filter((item: TreeItem) => !shouldIgnorePath(item.path, ignorePatterns));
}

/**
 * Gets file content from repository
 * 
 * @param repoInfo - Repository information
 * @param filePath - Path to file
 * @param branch - Branch name
 * @returns File content
 */
export async function getFileContent(repoInfo: RepoInfo, filePath: string, branch: string): Promise<string> {
  // Create a cache key specific to this file
  const cacheKey = `${repoInfo.owner}/${repoInfo.repo}/${branch}/${filePath}`;
  
  // Check cache first
  if (apiCache[cacheKey] && Date.now() - apiCache[cacheKey].timestamp < CACHE_EXPIRATION) {
    console.log("Using cached file content for:", filePath);
    return apiCache[cacheKey].data;
  }
  
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}?ref=${branch}`;
  const data = await fetchGitHubApi(url);
  
  // GitHub API returns base64-encoded content
  let content = '';
  if (data.encoding === 'base64' && data.content) {
    content = atob(data.content.replace(/\n/g, ''));
    
    // Cache the decoded content
    apiCache[cacheKey] = {
      data: content,
      timestamp: Date.now()
    };
  }
  
  return content;
}

/**
 * Clears the API cache
 */
export function clearApiCache(): void {
  Object.keys(apiCache).forEach(key => {
    delete apiCache[key];
  });
}
