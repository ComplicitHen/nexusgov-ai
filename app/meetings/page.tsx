'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Meeting } from '@/types';
import { MeetingUpload } from '@/components/meetings/meeting-upload';
import { MeetingList } from '@/components/meetings/meeting-list';
import { MeetingViewer } from '@/components/meetings/meeting-viewer';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Set up real-time listener for meetings
    const q = query(
      collection(db, 'meetings'),
      where('uploadedBy', '==', user.id),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const meetingsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            organizationId: data.organizationId,
            uploadedBy: data.uploadedBy,
            title: data.title,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
            duration: data.duration,
            uploadedAt: data.uploadedAt?.toDate() || new Date(),
            status: data.status,
            audioURL: data.audioURL,
            transcriptURL: data.transcriptURL,
            transcript: data.transcript,
            processingError: data.processingError,
            transcriptionCost: data.transcriptionCost,
            processingCost: data.processingCost,
            totalCost: data.totalCost,
            metadata: data.metadata || {},
          } as Meeting;
        });

        setMeetings(meetingsData);
        setLoading(false);

        // If a meeting is selected, update it
        if (selectedMeeting) {
          const updatedMeeting = meetingsData.find((m) => m.id === selectedMeeting.id);
          if (updatedMeeting) {
            setSelectedMeeting(updatedMeeting);
          }
        }
      },
      (error) => {
        console.error('Error loading meetings:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowUpload(false);
  };

  const handleUploadComplete = () => {
    // Meetings list will auto-update via real-time listener
    setShowUpload(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Möten</h1>
            <p className="mt-2 text-gray-600">
              Ladda upp ljudinspelningar och generera mötesprotokoll automatiskt med AI
            </p>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-600">Laddar möten...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Upload Toggle Button */}
                <button
                  onClick={() => {
                    setShowUpload(!showUpload);
                    setSelectedMeeting(null);
                  }}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    showUpload
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {showUpload ? 'Visa möten' : '+ Ladda upp möte'}
                </button>

                {/* Meeting List */}
                <MeetingList
                  meetings={meetings}
                  onSelectMeeting={handleSelectMeeting}
                  selectedMeetingId={selectedMeeting?.id}
                />
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                {showUpload ? (
                  <MeetingUpload onUploadComplete={handleUploadComplete} />
                ) : selectedMeeting ? (
                  <MeetingViewer
                    meeting={selectedMeeting}
                    onClose={() => setSelectedMeeting(null)}
                  />
                ) : (
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Inget möte valt</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Välj ett möte från listan eller ladda upp en ny inspelning
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowUpload(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Ladda upp möte
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Så här använder du mötesfunktionen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium">Ladda upp ljudfil</div>
                  <div className="text-gray-600">Stödda format: MP3, WAV, M4A, OGG. Max 25 MB.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium">Automatisk transkribering</div>
                  <div className="text-gray-600">Whisper AI transkriberar ljud till text på svenska.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium">AI-genererat protokoll</div>
                  <div className="text-gray-600">Få sammanfattning, åtgärdspunkter och beslut automatiskt.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <div>
                  <div className="font-medium">Exportera resultat</div>
                  <div className="text-gray-600">Ladda ner protokoll som PDF eller DOCX.</div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200 text-xs text-gray-600">
              <strong>Kostnad:</strong> Cirka 0,06 SEK per minut ljud för transkribering + AI-bearbetning
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
