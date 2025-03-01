
import { useState } from 'react';
import { Plus, X, FileCode, FolderClosed } from 'lucide-react';

interface IgnorePatternsProps {
  ignorePatterns: string[];
  sourceIgnorePatterns: string[];
  onIgnorePatternsChange: (patterns: string[]) => void;
  onSourceIgnorePatternsChange: (patterns: string[]) => void;
}

const IgnorePatterns = ({
  ignorePatterns,
  sourceIgnorePatterns,
  onIgnorePatternsChange,
  onSourceIgnorePatternsChange
}: IgnorePatternsProps) => {
  const [newPattern, setNewPattern] = useState('');
  const [newSourcePattern, setNewSourcePattern] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'source'>('files');

  const addPattern = () => {
    if (!newPattern.trim()) return;
    onIgnorePatternsChange([...ignorePatterns, newPattern.trim()]);
    setNewPattern('');
  };

  const removePattern = (index: number) => {
    const updated = [...ignorePatterns];
    updated.splice(index, 1);
    onIgnorePatternsChange(updated);
  };

  const addSourcePattern = () => {
    if (!newSourcePattern.trim()) return;
    onSourceIgnorePatternsChange([...sourceIgnorePatterns, newSourcePattern.trim()]);
    setNewSourcePattern('');
  };

  const removeSourcePattern = (index: number) => {
    const updated = [...sourceIgnorePatterns];
    updated.splice(index, 1);
    onSourceIgnorePatternsChange(updated);
  };

  return (
    <div className="glass-panel p-4 animate-fade-in">
      <div className="flex space-x-4 mb-4">
        <button
          className={`flex-1 py-2 px-4 rounded-md transitions-all ${
            activeTab === 'files'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary text-secondary-foreground'
          }`}
          onClick={() => setActiveTab('files')}
        >
          <div className="flex items-center justify-center">
            <FolderClosed size={16} className="mr-2" />
            <span>ファイル/ディレクトリ除外</span>
          </div>
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md transitions-all ${
            activeTab === 'source'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary text-secondary-foreground'
          }`}
          onClick={() => setActiveTab('source')}
        >
          <div className="flex items-center justify-center">
            <FileCode size={16} className="mr-2" />
            <span>ソースコード除外</span>
          </div>
        </button>
      </div>

      {activeTab === 'files' ? (
        <>
          <div className="flex mb-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-l-md focus:outline-none focus:ring-2 focus:ring-ring transitions-all"
              placeholder="*.md, node_modules/, etc."
              onKeyDown={(e) => e.key === 'Enter' && addPattern()}
            />
            <button
              onClick={addPattern}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-r-md hover:bg-opacity-90 transitions-all"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">除外パターン</h3>
            {ignorePatterns.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">除外パターンはありません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ignorePatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-secondary px-3 py-1 rounded-full text-sm"
                  >
                    <span>{pattern}</span>
                    <button
                      onClick={() => removePattern(index)}
                      className="ml-2 text-muted-foreground hover:text-destructive transitions-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex mb-2">
            <input
              type="text"
              value={newSourcePattern}
              onChange={(e) => setNewSourcePattern(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-l-md focus:outline-none focus:ring-2 focus:ring-ring transitions-all"
              placeholder="TODO:, FIXME:, etc."
              onKeyDown={(e) => e.key === 'Enter' && addSourcePattern()}
            />
            <button
              onClick={addSourcePattern}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-r-md hover:bg-opacity-90 transitions-all"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">ソースコード除外パターン</h3>
            {sourceIgnorePatterns.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">除外パターンはありません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sourceIgnorePatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-secondary px-3 py-1 rounded-full text-sm"
                  >
                    <span>{pattern}</span>
                    <button
                      onClick={() => removeSourcePattern(index)}
                      className="ml-2 text-muted-foreground hover:text-destructive transitions-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default IgnorePatterns;
