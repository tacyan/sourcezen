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
  
  // Common problematic file extensions that should be ignored by default
  const problematicExtensions = ['.html', '.htm', '.xml', '.svg', '.dtd'];
  const fileExtension = path.match(/\.([^.]+)$/)?.[0] || '';
  
  if (problematicExtensions.includes(fileExtension)) {
    return true;
  }
  
  // Common problematic path patterns
  const problematicPatterns = [
    'index.html',
    'index.htm',
    'feed.xml',
    'sitemap.xml',
    '404.html',
    'public/index.html',
    'dist/index.html',
    'build/index.html'
  ];
  
  if (problematicPatterns.some(pattern => path.endsWith(pattern))) {
    return true;
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
 * Checks if a file is likely to be a binary file
 * 
 * @param fileName - File name
 * @returns Boolean indicating if the file is likely binary
 */
export function isLikelyBinaryFile(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  const binaryExtensions = [
    // Images
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'tiff', 'tif',
    // Audio/Video
    'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv',
    // Archives
    'zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz',
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    // Executables and binaries
    'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o', 'a', 'lib', 'out', 'app',
    // Other binary formats
    'db', 'sqlite', 'pyc', 'class', 'jar'
  ];
  
  return binaryExtensions.includes(extension);
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
