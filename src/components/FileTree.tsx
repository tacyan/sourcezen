
import { useState } from 'react';
import { FileNode } from '@/lib/github/fileUtils';
import { ChevronDown, ChevronRight, Folder, FolderOpen, File } from 'lucide-react';

interface FileTreeProps {
  tree: FileNode;
  maxDepth?: number;
  onSelect?: (node: FileNode) => void;
}

const FileTreeNode = ({ 
  node, 
  depth = 0, 
  onSelect 
}: { 
  node: FileNode; 
  depth?: number; 
  onSelect?: (node: FileNode) => void;
}) => {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };
  
  const handleClick = () => {
    if (onSelect) {
      onSelect(node);
    }
  };
  
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Simple mapping of file types to icons
    if (extension === 'js' || extension === 'jsx' || extension === 'ts' || extension === 'tsx') {
      return <File className="text-yellow-500" size={16} />;
    } else if (extension === 'md') {
      return <File className="text-blue-500" size={16} />;
    } else if (extension === 'json') {
      return <File className="text-green-500" size={16} />;
    } else if (extension === 'css' || extension === 'scss') {
      return <File className="text-purple-500" size={16} />;
    } else if (extension === 'html') {
      return <File className="text-orange-500" size={16} />;
    } else {
      return <File className="text-gray-500" size={16} />;
    }
  };
  
  return (
    <div>
      <div 
        className={`file-tree-item flex items-center ${node.type === 'file' ? 'ml-6' : ''}`}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <span className="mr-1 cursor-pointer" onClick={handleToggle}>
            {isOpen ? (
              <ChevronDown size={16} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
          </span>
        )}
        
        <span className="mr-1">
          {node.type === 'directory' ? (
            isOpen ? (
              <FolderOpen className="text-yellow-500" size={16} />
            ) : (
              <Folder className="text-yellow-500" size={16} />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        
        <span className="truncate">{node.name || 'root'}</span>
      </div>
      
      {hasChildren && isOpen && (
        <div className="pl-4 border-l border-border ml-3 mt-1">
          {node.children
            ?.sort((a, b) => {
              // Directories first, then files
              if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
              }
              // Alphabetical within the same type
              return a.name.localeCompare(b.name);
            })
            .map((child, index) => (
              <FileTreeNode 
                key={`${child.path}-${index}`} 
                node={child} 
                depth={depth + 1}
                onSelect={onSelect}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const FileTree = ({ tree, maxDepth = -1, onSelect }: FileTreeProps) => {
  return (
    <div className="file-tree glass-panel p-4 animate-fade-in">
      <h3 className="font-semibold mb-3">ファイル構造</h3>
      <div className="text-sm">
        <FileTreeNode node={tree} onSelect={onSelect} />
      </div>
    </div>
  );
};

export default FileTree;
