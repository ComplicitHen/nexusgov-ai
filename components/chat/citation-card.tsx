'use client';

interface CitationSource {
  content: string;
  score: number;
  source: {
    documentId: string;
    fileName: string;
    fileType: string;
    chunkIndex: number;
  };
}

interface CitationCardProps {
  sources: CitationSource[];
}

export function CitationCard({ sources }: CitationCardProps) {
  if (!sources || sources.length === 0) return null;

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
      </svg>
    );
  };

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h4 className="text-sm font-semibold text-blue-900">
          Källor ({sources.length})
        </h4>
      </div>

      <div className="space-y-2">
        {sources.map((source, index) => (
          <details
            key={index}
            className="bg-white rounded-md border border-blue-100 overflow-hidden"
          >
            <summary className="px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-2">
              {getFileIcon(source.source.fileType)}
              <span className="text-sm font-medium text-gray-900 flex-1">
                {source.source.fileName}
              </span>
              <span className="text-xs text-gray-500">
                Relevans: {(source.score * 100).toFixed(0)}%
              </span>
            </summary>
            <div className="px-3 py-2 border-t border-blue-100">
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {source.content}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>Del {source.source.chunkIndex + 1}</span>
                <span>•</span>
                <span>Dokument-ID: {source.source.documentId.slice(0, 8)}...</span>
              </div>
            </div>
          </details>
        ))}
      </div>

      <p className="mt-3 text-xs text-blue-700">
        💡 AI:n har använt information från dessa dokument för att svara på din fråga.
      </p>
    </div>
  );
}
