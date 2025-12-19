'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { Document } from '@/types';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'GLOBAL' | 'UNIT' | 'PRIVATE'>('PRIVATE');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Query documents user has access to
      const q = query(
        collection(db, 'documents'),
        where('uploadedBy', '==', user.id),
        orderBy('uploadedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          organizationId: data.organizationId,
          uploadedBy: data.uploadedBy,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          uploadedAt: data.uploadedAt?.toDate() || new Date(),
          visibility: data.visibility,
          allowedUnitIds: data.allowedUnitIds || [],
          status: data.status,
          processingError: data.processingError,
          vectorCount: data.vectorCount || 0,
          embeddingModel: data.embeddingModel || 'text-embedding-3-small',
          metadata: data.metadata || {},
        } as Document;
      });

      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ];

      if (!allowedTypes.includes(file.type)) {
        setMessage({
          type: 'error',
          text: 'Filtypen stöds inte. Tillåtna format: PDF, DOCX, XLSX, TXT',
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessage({
          type: 'error',
          text: 'Filen är för stor. Max storlek: 10 MB',
        });
        return;
      }

      setSelectedFile(file);
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
        `documents/${user.organizationId}/${user.id}/${Date.now()}_${selectedFile.name}`
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
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Create document record in Firestore
          const docData = {
            organizationId: user.organizationId,
            uploadedBy: user.id,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            uploadedAt: new Date(),
            visibility,
            status: 'PROCESSING',
            vectorCount: 0,
            embeddingModel: 'text-embedding-3-small',
            downloadURL,
            metadata: {},
          };

          // Save to Firestore
          await fetch('/api/documents/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docData),
          });

          setMessage({
            type: 'success',
            text: 'Dokument uppladdat! Bearbetning påbörjad...',
          });

          setSelectedFile(null);
          setUploadProgress(0);
          setUploading(false);

          // Reload documents
          setTimeout(() => loadDocuments(), 2000);
        }
      );
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setMessage({
        type: 'error',
        text: `Fel vid uppladdning: ${error.message}`,
      });
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (fileType.includes('word')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (fileType.includes('sheet')) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
      </svg>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleRetryProcessing = async (documentId: string) => {
    try {
      setMessage({ type: 'success', text: 'Startar om bearbetning...' });

      await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      setMessage({ type: 'success', text: 'Bearbetning påbörjad!' });

      // Reload documents after a short delay
      setTimeout(() => loadDocuments(), 2000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Kunde inte starta om bearbetning: ${error.message}`,
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <AppHeader />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Dokumentbibliotek</h1>
              <p className="mt-2 text-gray-600">
                Ladda upp dokument för RAG-baserade AI-svar med källhänvisningar
              </p>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Ladda upp dokument
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Välj fil
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.xlsx,.txt"
                      disabled={uploading}
                    />
                    {selectedFile && (
                      <span className="text-sm text-gray-600">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Tillåtna format: PDF, DOCX, XLSX, TXT (max 10 MB)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Synlighet
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    disabled={uploading}
                  >
                    <option value="PRIVATE">Privat (endast jag)</option>
                    <option value="UNIT">Enhet (min avdelning)</option>
                    <option value="GLOBAL">Global (hela organisationen)</option>
                  </select>
                </div>

                {uploading && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Laddar upp...</span>
                      <span className="font-medium text-gray-900">
                        {uploadProgress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                  {uploading ? 'Laddar upp...' : 'Ladda upp dokument'}
                </Button>
              </div>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Mina dokument</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Laddar dokument...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
                  <p>Inga dokument än. Ladda upp ditt första dokument!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {getFileIcon(doc.fileType)}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.fileName}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>
                              {doc.uploadedAt.toLocaleDateString('sv-SE')}
                            </span>
                            <span>•</span>
                            <span
                              className={`px-2 py-1 rounded ${
                                doc.status === 'READY'
                                  ? 'bg-green-100 text-green-800'
                                  : doc.status === 'PROCESSING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {doc.status === 'READY'
                                ? 'Klar'
                                : doc.status === 'PROCESSING'
                                ? 'Bearbetar...'
                                : 'Fel'}
                            </span>
                            {doc.visibility && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{doc.visibility.toLowerCase()}</span>
                              </>
                            )}
                          </div>

                          {doc.status === 'READY' && doc.vectorCount > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.vectorCount} vektorinbäddningar skapade med {doc.embeddingModel}
                            </p>
                          )}

                          {doc.status === 'ERROR' && doc.processingError && (
                            <p className="text-xs text-red-600 mt-1">
                              Fel: {doc.processingError}
                            </p>
                          )}

                          {doc.status === 'ERROR' && !doc.processingError && (
                            <p className="text-xs text-red-600 mt-1">
                              Bearbetning misslyckades. Försök igen.
                            </p>
                          )}

                          {doc.metadata?.extractedTextLength && (
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.metadata.extractedTextLength.toLocaleString()} tecken extraherade
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {doc.status === 'ERROR' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryProcessing(doc.id)}
                            >
                              Försök igen
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            Visa
                          </Button>
                          <Button variant="destructive" size="sm">
                            Radera
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Om RAG (Retrieval-Augmented Generation)
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Dokument bearbetas och delas upp i mindre delar</li>
                <li>Varje del omvandlas till en vektor (embedding)</li>
                <li>När du chattar söks relevanta delar upp automatiskt</li>
                <li>AI:n får exakta källreferenser att utgå från</li>
                <li>Du ser vilka dokument och sidor AI:n använt</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
