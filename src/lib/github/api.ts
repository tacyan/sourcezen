
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
 * Fetches a GitHub API URL with proper authentication if available
 * 
 * @param url - GitHub API URL
 * @returns Response from GitHub API
 */
async function fetchGitHubApi(url: string): Promise<any> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  // If using a GitHub token (for higher rate limits)
  const token = process.env.GITHUB_TOKEN || '';
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
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
 * @returns Repository tree
 */
export async function getRepoTree(repoInfo: RepoInfo, branch: string): Promise<TreeItem[]> {
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${branch}?recursive=1`;
  const data = await fetchGitHubApi(url);
  return data.tree;
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
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}?ref=${branch}`;
  const data = await fetchGitHubApi(url);
  
  // GitHub API returns base64-encoded content
  if (data.encoding === 'base64' && data.content) {
    return atob(data.content.replace(/\n/g, ''));
  }
  
  return data;
}
