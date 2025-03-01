
import { useState } from 'react';
import { FileNode } from '@/lib/github/fileUtils';
import { ChevronDown, ChevronRight, Folder, FolderOpen, File } from 'lucide-react';

interface FileTreeProps {
  tree: FileNode;
  onSelect?: (filePath: string) => void;
  selectedFile: string | null;
  maxDepth?: number;
}

const FileTreeNode = ({ 
  node, 
  depth = 0, 
  onSelect,
  selectedFile,
  isRoot = false
}: { 
  node: FileNode; 
  depth?: number; 
  onSelect?: (filePath: string) => void;
  selectedFile: string | null;
  isRoot?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(depth < 1 || isRoot);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFile === node.path;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };
  
  const handleClick = () => {
    if (node.type === 'file' && onSelect && node.path) {
      onSelect(node.path);
    } else if (hasChildren) {
      setIsOpen(!isOpen);
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
    } else if (extension === 'svg' || extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'gif') {
      return <File className="text-green-400" size={16} />;
    } else {
      return <File className="text-gray-500" size={16} />;
    }
  };
  
  // Skip rendering empty root node with no name
  if (isRoot && !node.name && hasChildren) {
    return (
      <div className="file-tree-root">
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
              depth={depth}
              onSelect={onSelect}
              selectedFile={selectedFile}
            />
          ))}
      </div>
    );
  }
  
  return (
    <div>
      <div 
        className={`file-tree-item flex items-center ${node.type === 'file' ? 'ml-6' : ''} py-1 px-2 rounded-md cursor-pointer ${isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
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
        
        <span className="truncate font-medium">{node.name || 'root'}</span>
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
                selectedFile={selectedFile}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const FileTree = ({ tree, onSelect, selectedFile, maxDepth = -1 }: FileTreeProps) => {
  return (
    <div className="file-tree glass-panel p-4 rounded-lg shadow-md animate-fade-in">
      <div className="text-sm">
        <FileTreeNode 
          node={tree} 
          onSelect={onSelect} 
          selectedFile={selectedFile}
          isRoot={true}
        />
      </div>
    </div>
  );
};

export default FileTree;
