
/**
 * File utility functions
 * 
 * This module provides functions for handling files and directories
 * from GitHub repositories.
 */

interface TreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  url: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

/**
 * Checks if a file or directory should be ignored based on patterns
 * 
 * @param path - File or directory path
 * @param ignorePatterns - Array of glob patterns to ignore
 * @returns Boolean indicating if the path should be ignored
 */
export function shouldIgnore(path: string, ignorePatterns: string[]): boolean {
  if (!ignorePatterns || ignorePatterns.length === 0) {
    return false;
  }
  
  for (const pattern of ignorePatterns) {
    // Convert glob patterns to regex
    // Simple implementation for common patterns
    const regexPattern = pattern
      // Escape special regex characters
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      // Convert * to regex equivalent (any character except path separator)
      .replace(/\*/g, '[^/]*')
      // Convert ** to regex equivalent (any character including path separator)
      .replace(/\*\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(path)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Builds a file tree from GitHub tree items
 * 
 * @param tree - Array of GitHub tree items
 * @param ignorePatterns - Array of glob patterns to ignore
 * @param maxDepth - Maximum depth of tree (-1 for unlimited)
 * @returns Root of file tree
 */
export function buildFileTree(
  tree: TreeItem[],
  ignorePatterns: string[] = [],
  maxDepth: number = -1
): FileNode {
  // Create root node
  const root: FileNode = {
    name: '',
    path: '',
    type: 'directory',
    children: []
  };
  
  // Sort tree items to ensure directories come before their contents
  const sortedTree = [...tree].sort((a, b) => a.path.localeCompare(b.path));
  
  // Process each tree item
  for (const item of sortedTree) {
    // Skip ignored items
    if (shouldIgnore(item.path, ignorePatterns)) {
      continue;
    }
    
    // Count path depth
    const depth = item.path.split('/').length;
    if (maxDepth > 0 && depth > maxDepth) {
      continue;
    }
    
    // Split path into parts
    const pathParts = item.path.split('/');
    const fileName = pathParts.pop() as string;
    
    // Find parent directory
    let currentNode = root;
    for (const part of pathParts) {
      // Skip if at root
      if (!part) continue;
      
      // Find or create directory node
      let foundNode = currentNode.children?.find(child => child.name === part);
      if (!foundNode) {
        foundNode = {
          name: part,
          path: currentNode.path ? `${currentNode.path}/${part}` : part,
          type: 'directory',
          children: []
        };
        currentNode.children?.push(foundNode);
      }
      currentNode = foundNode;
    }
    
    // Add file node
    if (item.type === 'blob') {
      currentNode.children?.push({
        name: fileName,
        path: item.path,
        type: 'file'
      });
    }
  }
  
  return root;
}

/**
 * Gets the file extension
 * 
 * @param fileName - File name
 * @returns File extension or empty string
 */
export function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Gets the icon name for a file based on its extension
 * 
 * @param fileName - File name
 * @returns Icon CSS class name
 */
export function getFileIconClass(fileName: string): string {
  const extension = getFileExtension(fileName);
  
  // Code files
  const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'html', 'css', 'scss', 'json', 'yml', 'xml'];
  if (codeExtensions.includes(extension)) {
    return 'file-icon-code';
  }
  
  // Image files
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'];
  if (imageExtensions.includes(extension)) {
    return 'file-icon-image';
  }
  
  // Document files
  const docExtensions = ['md', 'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  if (docExtensions.includes(extension)) {
    return 'file-icon-document';
  }
  
  // Default
  return 'file-icon-default';
}
