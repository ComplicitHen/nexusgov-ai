'use client';

import { Meeting } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MeetingListProps {
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
  selectedMeetingId?: string;
}

export function MeetingList({ meetings, onSelectMeeting, selectedMeetingId }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Inga möten än</h3>
        <p className="mt-1 text-sm text-gray-500">
          Kom igång genom att ladda upp din första ljudinspelning.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Mina möten ({meetings.length})</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            onClick={() => onSelectMeeting(meeting)}
            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
              selectedMeetingId === meeting.id ? 'bg-blue-50 hover:bg-blue-100' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {meeting.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>{meeting.fileName}</span>
                  <span>•</span>
                  <span>{formatFileSize(meeting.fileSize)}</span>
                  {meeting.duration && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(meeting.duration)}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {formatDistanceToNow(meeting.uploadedAt, {
                    addSuffix: true,
                    locale: sv,
                  })}
                </div>
              </div>

              <div className="ml-4 flex-shrink-0">
                {getStatusBadge(meeting.status)}
              </div>
            </div>

            {/* Show error if present */}
            {meeting.status === 'ERROR' && meeting.processingError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                {meeting.processingError}
              </div>
            )}

            {/* Show metadata if available */}
            {meeting.metadata?.participants && meeting.metadata.participants.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Deltagare:</span>{' '}
                {meeting.metadata.participants.slice(0, 3).join(', ')}
                {meeting.metadata.participants.length > 3 && (
                  <span className="text-gray-500">
                    {' '}
                    +{meeting.metadata.participants.length - 3} till
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusBadge(status: Meeting['status']) {
  const statusConfig = {
    UPLOADING: {
      label: 'Laddar upp',
      className: 'bg-blue-100 text-blue-800',
      icon: (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ),
    },
    TRANSCRIBING: {
      label: 'Transkriberar',
      className: 'bg-yellow-100 text-yellow-800',
      icon: (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ),
    },
    PROCESSING: {
      label: 'Bearbetar',
      className: 'bg-purple-100 text-purple-800',
      icon: (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ),
    },
    READY: {
      label: 'Klar',
      className: 'bg-green-100 text-green-800',
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    ERROR: {
      label: 'Fel',
      className: 'bg-red-100 text-red-800',
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
