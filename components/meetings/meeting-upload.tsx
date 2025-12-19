'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/auth-context';

interface MeetingUploadProps {
  onUploadComplete: () => void;
}

export function MeetingUpload({ onUploadComplete }: MeetingUploadProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (audio only)
      const allowedTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/m4a',
        'audio/ogg',
        'audio/webm',
        'audio/mp4',
        'audio/x-m4a',
      ];

      const fileName = file.name.toLowerCase();
      const fileExt = fileName.split('.').pop();
      const validExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4', 'mpeg', 'mpga'];

      if (!allowedTypes.includes(file.type) && !validExtensions.includes(fileExt || '')) {
        setMessage({
          type: 'error',
          text: 'Filtypen stöds inte. Tillåtna format: MP3, WAV, M4A, OGG, WEBM',
        });
        return;
      }

      // Validate file size (max 25MB for Whisper API)
      if (file.size > 25 * 1024 * 1024) {
        setMessage({
          type: 'error',
          text: 'Filen är för stor. Max storlek: 25 MB',
        });
        return;
      }

      setSelectedFile(file);
      if (!title) {
        // Set default title from filename (remove extension)
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadProgress(0);
    setMessage(null);

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(
        storage,
        `meetings/${user.organizationId}/${user.id}/${Date.now()}_${selectedFile.name}`
      );

      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          setMessage({
            type: 'error',
            text: `Uppladdning misslyckades: ${error.message}`,
          });
          setUploading(false);
        },
        async () => {
          // Upload complete, get download URL
          const audioURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Parse participants
          const participantsList = participants
            ? participants.split(',').map(p => p.trim()).filter(Boolean)
            : [];

          // Create meeting record
          const meetingData = {
            organizationId: user.organizationId,
            uploadedBy: user.id,
            title: title || selectedFile.name.replace(/\.[^/.]+$/, ''),
            fileName: selectedFile.name,
            fileType: selectedFile.name.split('.').pop()?.toLowerCase() || 'audio',
            fileSize: selectedFile.size,
            audioURL,
            metadata: {
              participants: participantsList,
              language: 'sv', // Default to Swedish
            },
          };

          // Save to Firestore via API
          const response = await fetch('/api/meetings/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meetingData),
          });

          const result = await response.json();

          if (response.ok) {
            setMessage({
              type: 'success',
              text: result.message || 'Mötet har laddats upp! Transkribering påbörjad...',
            });

            // Reset form
            setSelectedFile(null);
            setTitle('');
            setParticipants('');
            setUploadProgress(0);
            setUploading(false);

            // Reload meetings list
            setTimeout(() => onUploadComplete(), 2000);
          } else {
            throw new Error(result.message || 'Upload failed');
          }
        }
      );
    } catch (error: any) {
      console.error('Error uploading meeting:', error);
      setMessage({
        type: 'error',
        text: `Fel vid uppladdning: ${error.message}`,
      });
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Ladda upp möte</h2>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ljudfil
          </label>
          <Input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Stödda format: MP3, WAV, M4A, OGG, WEBM. Max storlek: 25 MB
          </p>
        </div>

        {/* Meeting Title */}
        {selectedFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mötestitel
            </label>
            <Input
              type="text"
              placeholder="T.ex. Styrelsemöte 2025-01-15"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>
        )}

        {/* Participants */}
        {selectedFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deltagare (valfritt)
            </label>
            <Input
              type="text"
              placeholder="Anna Andersson, Bengt Bergström, ..."
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ange deltagare separerade med kommatecken
            </p>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Laddar upp...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading ? 'Laddar upp...' : 'Ladda upp och transkribera'}
        </Button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Så här fungerar det:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Ladda upp en ljudfil från ett möte</li>
          <li>Filen transkriberas automatiskt med Whisper AI</li>
          <li>Mötesprotokoll, åtgärdspunkter och beslut genereras med AI</li>
          <li>Granska och exportera resultatet till PDF eller DOCX</li>
        </ol>
        <p className="text-xs text-blue-700 mt-2">
          <strong>Kostnad:</strong> Cirka 0,06 SEK per minut ljud + AI-bearbetning
        </p>
      </div>
    </div>
  );
}
