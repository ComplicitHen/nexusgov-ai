'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { KlarsprakResult } from '@/lib/utils/klarsprak';

const SAMPLE_TEXT = `Ansökan om bygglov ska inlämnas av den sökande i enlighet med gällande bestämmelser. Vidtagande av åtgärder i syfte att genomföra en utvärdering av projektets genomförbarhet ska ske innan beslut fattas. I samband med detta ska hänsyn tas till samtliga berörda parters synpunkter och input. Beslut kommer att fattas av ansvarig myndighet efter det att erforderliga handlingar inkommit och fullständig granskning genomförts.`;

export default function KlarsprakPage() {
  const [originalText, setOriginalText] = useState('');
  const [result, setResult] = useState<KlarsprakResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimplify = async () => {
    if (!originalText.trim()) {
      setError('Vänligen ange text att förenkla');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/klarsprak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ett fel uppstod');
      }

      setResult(data.result);
    } catch (err: any) {
      console.error('Klarspråk error:', err);
      setError(err.message || 'Ett fel uppstod vid förenkling av texten');
    } finally {
      setProcessing(false);
    }
  };

  const loadSample = () => {
    setOriginalText(SAMPLE_TEXT);
    setResult(null);
    setError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Text kopierad till urklipp!');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Klarspråk</h1>
            <p className="mt-2 text-gray-600">
              Förenkla byråkratisk svenska till tydligt och lättläst språk
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Original text</h2>
                  <Button variant="outline" size="sm" onClick={loadSample}>
                    Ladda exempeltext
                  </Button>
                </div>

                <textarea
                  className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Klistra in byråkratisk text här..."
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  disabled={processing}
                />

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {originalText.length} / 10,000 tecken
                  </span>
                  <Button onClick={handleSimplify} disabled={processing || !originalText.trim()}>
                    {processing ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
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
                        Förenklar...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Förenkla text
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Output Section */}
            <div>
              {result ? (
                <div className="space-y-6">
                  {/* Simplified Text */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Förenklad text</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result.simplifiedText)}
                      >
                        Kopiera
                      </Button>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {result.simplifiedText}
                      </p>
                    </div>
                  </div>

                  {/* Readability Scores */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Läsbarhet</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-2">Före</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-orange-500 h-3 rounded-full"
                              style={{ width: `${result.readabilityScore.before}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {result.readabilityScore.before}/100
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2">Efter</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-green-500 h-3 rounded-full"
                              style={{ width: `${result.readabilityScore.after}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {result.readabilityScore.after}/100
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-green-50 rounded-md text-sm text-green-800">
                      <strong>Förbättring:</strong> +
                      {result.readabilityScore.after - result.readabilityScore.before} poäng (
                      {Math.round(
                        ((result.readabilityScore.after - result.readabilityScore.before) /
                          result.readabilityScore.before) *
                          100
                      )}
                      % lättare att läsa)
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Antal ord</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-semibold text-gray-900">
                            {result.statistics.simplifiedWordCount}
                          </span>
                          <span className="text-sm text-gray-500">
                            (var {result.statistics.originalWordCount})
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Antal meningar</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-semibold text-gray-900">
                            {result.statistics.simplifiedSentenceCount}
                          </span>
                          <span className="text-sm text-gray-500">
                            (var {result.statistics.originalSentenceCount})
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-500">Genomsnittlig meningslängd</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-semibold text-gray-900">
                            {result.statistics.averageWordsPerSentenceAfter.toFixed(1)} ord
                          </span>
                          <span className="text-sm text-gray-500">
                            (var {result.statistics.averageWordsPerSentenceBefore.toFixed(1)} ord)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Improvements */}
                  {result.improvements.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Förbättringar ({result.improvements.length})
                      </h3>
                      <div className="space-y-3">
                        {result.improvements.map((improvement, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-md">
                            <svg
                              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-900">
                                {getImprovementLabel(improvement.type)}
                              </div>
                              <div className="text-sm text-blue-800 mt-1">{improvement.description}</div>
                              {improvement.example && (
                                <div className="mt-2 space-y-1 text-xs">
                                  <div className="text-red-700">
                                    <span className="font-medium">Före:</span> "{improvement.example.before}"
                                  </div>
                                  <div className="text-green-700">
                                    <span className="font-medium">Efter:</span> "{improvement.example.after}"
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cost */}
                  <div className="text-xs text-gray-500 text-center">
                    Kostnad: {result.cost.toFixed(4)} SEK ({result.tokensUsed} tokens)
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4">✍️</div>
                  <h3 className="text-lg font-medium text-gray-900">Redo att förenkla</h3>
                  <p className="mt-2 text-sm text-gray-500 max-w-md">
                    Klistra in byråkratisk text till vänster och klicka på "Förenkla text" för att få en
                    lättläst version enligt klarspråksprinciper.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Om klarspråk</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <div className="font-medium mb-2">📜 Språklagen</div>
                <div className="text-gray-600">
                  Svenska myndigheter ska använda ett vårdat, enkelt och begripligt språk enligt språklagen.
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">👥 Tillgänglighet</div>
                <div className="text-gray-600">
                  Klarspråk gör information tillgänglig för alla medborgare, oavsett utbildningsnivå.
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">⚡ Effektivitet</div>
                <div className="text-gray-600">
                  Tydlig kommunikation minskar missförstånd och ärenden som behöver förtydligas.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function getImprovementLabel(type: string): string {
  const labels: Record<string, string> = {
    PASSIVE_TO_ACTIVE: 'Aktivt språk',
    JARGON_REMOVAL: 'Bort med jargong',
    SHORTER_SENTENCES: 'Kortare meningar',
    SIMPLER_WORDS: 'Enklare ord',
    CLEARER_STRUCTURE: 'Tydligare struktur',
  };
  return labels[type] || 'Förbättring';
}
