
/**
 * Markdown generation utilities
 * 
 * This module provides functions for generating markdown documentation
 * from GitHub repository information.
 */

import { FileNode } from '../github/fileUtils';
import { getFileContent } from '../github/api';

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

interface LanguageStats {
  [key: string]: number;
}

/**
 * Generates repository header markdown
 * 
 * @param repoInfo - Repository information
 * @param repoDetails - Repository details
 * @returns Markdown string
 */
function generateRepoHeader(repoInfo: RepoInfo, repoDetails: RepositoryInfo): string {
  const description = repoDetails.description || 'No description provided.';
  const license = repoDetails.license?.name || 'ライセンス情報なし';
  const createdDate = new Date(repoDetails.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const updatedDate = new Date(repoDetails.updated_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  return `# ${repoDetails.name}

## リポジトリ情報

- **説明**: ${description}
- **所有者**: ${repoDetails.owner.login}
- **主要言語**: ${repoDetails.language || 'Not specified'}
- **ライセンス**: ${license}
- **作成日**: ${createdDate}
- **最終更新日**: ${updatedDate}

## 統計

- **スター数**: ${repoDetails.stargazers_count}
- **フォーク数**: ${repoDetails.forks_count}
- **ウォッチャー数**: ${repoDetails.watchers_count}
- **オープンイシュー数**: ${repoDetails.open_issues_count}
- **デフォルトブランチ**: ${repoDetails.default_branch}
`;
}

/**
 * Generates language statistics markdown
 * 
 * @param languageStats - Language statistics
 * @returns Markdown string
 */
function generateLanguageStats(languageStats: LanguageStats): string {
  if (!languageStats || Object.keys(languageStats).length === 0) {
    return '';
  }
  
  const total = Object.values(languageStats).reduce((sum, val) => sum + val, 0);
  const stats = Object.entries(languageStats)
    .map(([lang, bytes]) => ({
      language: lang,
      bytes,
      percentage: (bytes / total * 100).toFixed(1)
    }))
    .sort((a, b) => b.bytes - a.bytes);
  
  let markdown = '## 言語詳細\n\n';
  markdown += '| 言語 | 割合 | バイト数 |\n';
  markdown += '| --- | --- | --- |\n';
  
  for (const stat of stats) {
    markdown += `| ${stat.language} | ${stat.percentage}% | ${stat.bytes.toLocaleString()} |\n`;
  }
  
  return markdown + '\n';
}

/**
 * Generates contributors markdown
 * 
 * @param contributors - List of contributors
 * @returns Markdown string
 */
function generateContributors(contributors: Contributor[]): string {
  if (!contributors || contributors.length === 0) {
    return '';
  }
  
  let markdown = '## コントリビューター\n\n';
  
  for (const contributor of contributors) {
    markdown += `### ${contributor.login}\n\n`;
    markdown += `- **コントリビューション数**: ${contributor.contributions}\n`;
    markdown += `- **プロフィール**: [GitHub](${contributor.html_url})\n\n`;
    markdown += `![${contributor.login}](${contributor.avatar_url})\n\n`;
  }
  
  return markdown;
}

/**
 * Generates file tree markdown
 * 
 * @param node - File tree node
 * @param depth - Current depth
 * @returns Markdown string
 */
function generateFileTree(node: FileNode, depth: number = 0): string {
  if (!node.children || node.children.length === 0) {
    return '';
  }
  
  let markdown = '';
  
  // Sort: directories first, then files, all alphabetically
  const sortedChildren = [...node.children].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  
  for (const child of sortedChildren) {
    const prefix = '📁 ';
    const filePrefix = '📄 ';
    
    if (child.type === 'directory') {
      markdown += `${prefix}${child.name}\n`;
      // Recursively add children with increased depth
      const childrenTree = generateFileTree(child, depth + 1);
      if (childrenTree) {
        markdown += childrenTree.split('\n').map(line => `  ${line}`).join('\n') + '\n';
      }
    } else {
      markdown += `${filePrefix}${child.name}\n`;
    }
  }
  
  return markdown;
}

/**
 * Generates file content markdown
 * 
 * @param repoInfo - Repository information
 * @param filePath - Path to file
 * @param branch - Branch name
 * @param sourceIgnorePatterns - Patterns to ignore in source code
 * @returns Markdown string
 */
async function generateFileContent(
  repoInfo: RepoInfo,
  filePath: string, 
  branch: string,
  sourceIgnorePatterns: string[] = []
): Promise<string> {
  try {
    const content = await getFileContent(repoInfo, filePath, branch);
    const fileExtension = filePath.split('.').pop() || '';
    
    let markdown = `### ${filePath}\n\n`;
    
    // Filter content by source ignore patterns if needed
    let filteredContent = content;
    if (sourceIgnorePatterns.length > 0) {
      const lines = content.split('\n');
      const filteredLines = lines.filter(line => {
        for (const pattern of sourceIgnorePatterns) {
          if (line.includes(pattern)) {
            return false;
          }
        }
        return true;
      });
      filteredContent = filteredLines.join('\n');
    }
    
    markdown += '```' + fileExtension + '\n';
    markdown += filteredContent;
    markdown += '\n```\n\n';
    
    return markdown;
  } catch (error) {
    console.error(`Error generating content for ${filePath}:`, error);
    return `### ${filePath}\n\n*Error: Could not fetch file content*\n\n`;
  }
}

/**
 * Collects all file paths from a file tree
 * 
 * @param node - File tree node
 * @param filePaths - Array to store file paths
 */
function collectFilePaths(node: FileNode, filePaths: string[] = []): string[] {
  if (!node.children) {
    return filePaths;
  }
  
  for (const child of node.children) {
    if (child.type === 'file') {
      filePaths.push(child.path);
    } else if (child.type === 'directory') {
      collectFilePaths(child, filePaths);
    }
  }
  
  return filePaths;
}

/**
 * Generates repository markdown
 * 
 * @param repoInfo - Repository information
 * @param repoDetails - Repository details
 * @param contributors - List of contributors
 * @param fileTree - File tree
 * @param branch - Branch name
 * @param ignorePatterns - Patterns to ignore files/directories
 * @param sourceIgnorePatterns - Patterns to ignore in source code
 * @returns Markdown string
 */
export async function generateRepositoryMarkdown(
  repoInfo: RepoInfo,
  repoDetails: RepositoryInfo,
  contributors: Contributor[],
  fileTree: FileNode,
  branch: string,
  ignorePatterns: string[] = [],
  sourceIgnorePatterns: string[] = []
): Promise<string> {
  // Generate repo header
  let markdown = generateRepoHeader(repoInfo, repoDetails);
  
  // Add language stats (mock data - would need API call for real data)
  const languageStats = {
    "TypeScript": 88037,
    "JavaScript": 973,
    "CSS": 399
  };
  markdown += generateLanguageStats(languageStats);
  
  // Add contributors
  markdown += generateContributors(contributors);
  
  // Add file tree
  markdown += '## ファイル構造\n\n';
  markdown += generateFileTree(fileTree);
  markdown += '\n';
  
  // Add file contents (limit to first 10 files for performance)
  markdown += '## ファイル内容\n\n';
  const filePaths = collectFilePaths(fileTree);
  const selectedFiles = filePaths.slice(0, 10);
  
  for (const filePath of selectedFiles) {
    const fileContent = await generateFileContent(
      repoInfo, 
      filePath, 
      branch,
      sourceIgnorePatterns
    );
    markdown += fileContent;
  }
  
  return markdown;
}

/**
 * Converts markdown to HTML
 * 
 * @param markdown - Markdown string
 * @returns HTML string
 */
export function convertMarkdownToHtml(markdown: string): string {
  // This is a placeholder for a markdown-to-html converter
  // In a real application, you would use a library like 'marked' or 'showdown'
  return `<div class="markdown-output">${markdown}</div>`;
}
