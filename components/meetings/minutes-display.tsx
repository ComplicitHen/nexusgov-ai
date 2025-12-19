'use client';

import { MeetingMinutes, ActionItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MinutesDisplayProps {
  minutes: MeetingMinutes;
  meetingTitle: string;
}

export function MinutesDisplay({ minutes, meetingTitle }: MinutesDisplayProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'full' | 'actions' | 'decisions'>('summary');
  const [actionItems, setActionItems] = useState<ActionItem[]>(minutes.actionItems);

  const toggleActionItem = (index: number) => {
    const updated = [...actionItems];
    updated[index] = {
      ...updated[index],
      completed: !updated[index].completed,
    };
    setActionItems(updated);
  };

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'HIGH':
        return 'Hög';
      case 'MEDIUM':
        return 'Medel';
      case 'LOW':
        return 'Låg';
      default:
        return priority;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">{meetingTitle}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Genererat {minutes.generatedAt.toLocaleDateString('sv-SE')} med {minutes.generatedBy}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sammanfattning
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Åtgärder ({actionItems.length})
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'decisions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Beslut ({minutes.decisions.length})
          </button>
          <button
            onClick={() => setActiveTab('full')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'full'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Fullständigt protokoll
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sammanfattning</h3>
              <p className="text-gray-700 leading-relaxed">{minutes.summary}</p>
            </div>

            {/* Topics */}
            {minutes.topics.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Nyckelämnen</h3>
                <div className="flex flex-wrap gap-2">
                  {minutes.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{actionItems.length}</div>
                <div className="text-sm text-gray-500">Åtgärder</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{minutes.decisions.length}</div>
                <div className="text-sm text-gray-500">Beslut</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{minutes.topics.length}</div>
                <div className="text-sm text-gray-500">Ämnen</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Items Tab */}
        {activeTab === 'actions' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Åtgärdspunkter</h3>
            {actionItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Inga åtgärdspunkter identifierade</p>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      item.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.completed || false}
                        onChange={() => toggleActionItem(index)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}
                        >
                          {item.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          {item.assignee && (
                            <span className="text-gray-600">
                              <span className="font-medium">Ansvarig:</span> {item.assignee}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className="text-gray-600">
                              <span className="font-medium">Deadline:</span>{' '}
                              {new Date(item.dueDate).toLocaleDateString('sv-SE')}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded border text-xs ${getPriorityColor(item.priority)}`}>
                            {getPriorityLabel(item.priority)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Decisions Tab */}
        {activeTab === 'decisions' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Beslut</h3>
            {minutes.decisions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Inga beslut identifierade</p>
            ) : (
              <div className="space-y-2">
                {minutes.decisions.map((decision, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <svg
                      className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-gray-900">{decision}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full Minutes Tab */}
        {activeTab === 'full' && (
          <div>
            <div className="prose prose-sm max-w-none">
              <div
                className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: minutes.fullMinutes.replace(/\n/g, '<br/>') }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer with Export Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement PDF export
              alert('PDF-export kommer snart!');
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                clipRule="evenodd"
              />
            </svg>
            Exportera som PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement DOCX export
              alert('DOCX-export kommer snart!');
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                clipRule="evenodd"
              />
            </svg>
            Exportera som DOCX
          </Button>
        </div>
      </div>
    </div>
  );
}
