'use client';

import { Assistant } from '@/types';
import { useAuth } from '@/lib/auth/auth-context';

interface AssistantListProps {
  assistants: Assistant[];
  onSelect: (assistant: Assistant) => void;
  onEdit: (assistant: Assistant) => void;
  onDelete: (assistant: Assistant) => void;
  selectedId?: string;
}

export function AssistantList({ assistants, onSelect, onEdit, onDelete, selectedId }: AssistantListProps) {
  const { user } = useAuth();

  if (assistants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-sm font-medium text-gray-900">Inga assistenter ännu</h3>
        <p className="mt-1 text-sm text-gray-500">
          Skapa din första AI-assistent för att komma igång!
        </p>
      </div>
    );
  }

  // Group assistants
  const myAssistants = assistants.filter((a) => a.createdBy === user?.id);
  const orgAssistants = assistants.filter((a) => a.createdBy !== user?.id && a.organizationId === user?.organizationId);
  const publicAssistants = assistants.filter((a) => a.organizationId !== user?.organizationId);

  return (
    <div className="space-y-6">
      {/* My Assistants */}
      {myAssistants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Mina assistenter ({myAssistants.length})</h3>
          <div className="space-y-2">
            {myAssistants.map((assistant) => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelected={selectedId === assistant.id}
                isOwner={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Organization Assistants */}
      {orgAssistants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Organisationens assistenter ({orgAssistants.length})</h3>
          <div className="space-y-2">
            {orgAssistants.map((assistant) => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelected={selectedId === assistant.id}
                isOwner={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Public/Marketplace Assistants */}
      {publicAssistants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Marknadsplats ({publicAssistants.length})</h3>
          <div className="space-y-2">
            {publicAssistants.map((assistant) => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelected={selectedId === assistant.id}
                isOwner={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssistantCard({
  assistant,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
  isOwner,
}: {
  assistant: Assistant;
  onSelect: (assistant: Assistant) => void;
  onEdit: (assistant: Assistant) => void;
  onDelete: (assistant: Assistant) => void;
  isSelected: boolean;
  isOwner: boolean;
}) {
  return (
    <div
      onClick={() => onSelect(assistant)}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: assistant.color + '20' }}
        >
          {assistant.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{assistant.name}</h3>
              {assistant.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{assistant.description}</p>
              )}
            </div>

            {/* Actions (only for owner) */}
            {isOwner && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(assistant);
                  }}
                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Redigera"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Är du säker på att du vill radera "${assistant.name}"?`)) {
                      onDelete(assistant);
                    }
                  }}
                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Radera"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              {assistant.useCount} användningar
            </span>

            {assistant.attachedDocumentIds.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                {assistant.attachedDocumentIds.length} dokument
              </span>
            )}

            {assistant.isPublic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Publik
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
