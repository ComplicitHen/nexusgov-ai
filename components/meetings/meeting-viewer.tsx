'use client';

import { useState, useEffect } from 'react';
import { Meeting, MeetingMinutes } from '@/types';
import { Button } from '@/components/ui/button';
import { MinutesDisplay } from './minutes-display';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface MeetingViewerProps {
  meeting: Meeting;
  onClose: () => void;
}

export function MeetingViewer({ meeting, onClose }: MeetingViewerProps) {
  const [minutes, setMinutes] = useState<MeetingMinutes | null>(null);
  const [loadingMinutes, setLoadingMinutes] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (meeting.status === 'READY') {
      loadMinutes();
    }
  }, [meeting.id, meeting.status]);

  const loadMinutes = async () => {
    setLoadingMinutes(true);
    try {
      const minutesRef = doc(db, 'meetings', meeting.id, 'minutes', 'latest');
      const minutesSnap = await getDoc(minutesRef);

      if (minutesSnap.exists()) {
        const data = minutesSnap.data();
        setMinutes({
          meetingId: meeting.id,
          summary: data.summary,
          actionItems: data.actionItems || [],
          decisions: data.decisions || [],
          topics: data.topics || [],
          fullMinutes: data.fullMinutes,
          generatedAt: data.generatedAt?.toDate() || new Date(),
          generatedBy: data.generatedBy || 'AI',
        });
      }
    } catch (error) {
      console.error('Error loading minutes:', error);
    } finally {
      setLoadingMinutes(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const response = await fetch('/api/meetings/process', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      });

      if (response.ok) {
        alert('Återbearbetning har startats. Sidan laddas om...');
        window.location.reload();
      } else {
        const result = await response.json();
        alert(`Fel: ${result.message || 'Kunde inte starta återbearbetning'}`);
      }
    } catch (error) {
      console.error('Retry error:', error);
      alert('Ett fel uppstod vid återbearbetning');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{meeting.title}</h2>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div>
                <span className="font-medium">Fil:</span> {meeting.fileName}
              </div>
              {meeting.duration && (
                <div>
                  <span className="font-medium">Längd:</span>{' '}
                  {Math.floor(meeting.duration / 60)} min {Math.floor(meeting.duration % 60)} sek
                </div>
              )}
              <div>
                <span className="font-medium">Uppladdad:</span>{' '}
                {meeting.uploadedAt.toLocaleDateString('sv-SE')} {meeting.uploadedAt.toLocaleTimeString('sv-SE')}
              </div>
              {meeting.metadata?.participants && meeting.metadata.participants.length > 0 && (
                <div>
                  <span className="font-medium">Deltagare:</span> {meeting.metadata.participants.join(', ')}
                </div>
              )}
            </div>

            {/* Cost Information */}
            {meeting.totalCost && (
              <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-sm font-medium text-gray-700">Kostnad:</div>
                <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                  <div>Transkribering: {(meeting.transcriptionCost || 0).toFixed(4)} SEK</div>
                  <div>AI-bearbetning: {(meeting.processingCost || 0).toFixed(4)} SEK</div>
                  <div className="pt-1 border-t border-gray-200 font-medium text-gray-900">
                    Totalt: {meeting.totalCost.toFixed(4)} SEK
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={onClose}>
            Stäng
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {meeting.status === 'TRANSCRIBING' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <div>
              <div className="font-medium text-yellow-900">Transkriberar ljud...</div>
              <div className="text-sm text-yellow-700">Detta kan ta några minuter beroende på inspelningens längd.</div>
            </div>
          </div>
        </div>
      )}

      {meeting.status === 'PROCESSING' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-purple-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <div>
              <div className="font-medium text-purple-900">Bearbetar med AI...</div>
              <div className="text-sm text-purple-700">Genererar mötesprotokoll, åtgärdspunkter och beslut.</div>
            </div>
          </div>
        </div>
      )}

      {meeting.status === 'ERROR' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <div className="font-medium text-red-900">Ett fel uppstod</div>
              <div className="text-sm text-red-700 mt-1">{meeting.processingError || 'Okänt fel'}</div>
              <Button variant="outline" onClick={handleRetry} disabled={retrying} className="mt-3">
                {retrying ? 'Försöker igen...' : 'Försök igen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Section */}
      {meeting.transcript && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-gray-900">Transkription</span>
              <span className="text-sm text-gray-500">({meeting.transcript.length} tecken)</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${
                showTranscript ? 'rotate-180' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showTranscript && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{meeting.transcript}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meeting Minutes */}
      {meeting.status === 'READY' && (
        <div>
          {loadingMinutes ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-600">Laddar mötesprotokoll...</p>
            </div>
          ) : minutes ? (
            <MinutesDisplay minutes={minutes} meetingTitle={meeting.title} />
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
              <p className="text-gray-600">Kunde inte ladda mötesprotokoll.</p>
              <Button variant="outline" onClick={loadMinutes} className="mt-4">
                Försök igen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
