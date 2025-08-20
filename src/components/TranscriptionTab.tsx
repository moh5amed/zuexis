// 🎯 TRANSCRIPTION TAB COMPONENT
// Displays video transcription with timestamps and AI insights

import React, { useState, useEffect } from 'react';
import { AudioSegment } from '../services/audioProcessor';

interface TranscriptionTabProps {
  audioSegments: AudioSegment[];
  isVisible: boolean;
}

export const TranscriptionTab: React.FC<TranscriptionTabProps> = ({
  audioSegments,
  isVisible
}) => {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSegments, setFilteredSegments] = useState<AudioSegment[]>([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSegments(audioSegments);
    } else {
      const filtered = audioSegments.filter(segment =>
        segment.transcript.toLowerCase().includes(searchTerm.toLowerCase()) ||
        segment.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredSegments(filtered);
    }
  }, [searchTerm, audioSegments]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEmotionalToneColor = (tone: string): string => {
    switch (tone) {
      case 'excited': return 'text-orange-600 bg-orange-100';
      case 'calm': return 'text-blue-600 bg-blue-100';
      case 'energetic': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎵 Video Transcription
        </h2>
        <p className="text-gray-600">
          AI-powered transcription with sentiment analysis and insights
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search transcripts, keywords, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-3 top-2.5">
            🔍
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          Found {filteredSegments.length} segments
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>

      {/* Transcription Segments */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredSegments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No segments match your search' : 'No transcription available'}
          </div>
        ) : (
          filteredSegments.map((segment) => (
            <div
              key={segment.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedSegment === segment.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedSegment(
                selectedSegment === segment.id ? null : segment.id
              )}
            >
              {/* Segment Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({segment.duration.toFixed(1)}s)
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(segment.sentiment)}`}>
                    {segment.sentiment}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEmotionalToneColor(segment.emotionalTone)}`}>
                    {segment.emotionalTone}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(segment.confidence * 100)}% confidence
                  </span>
                </div>
              </div>

              {/* Transcript Text */}
              <div className="mb-3">
                <p className="text-gray-800 leading-relaxed">
                  {segment.transcript}
                </p>
              </div>

              {/* Keywords */}
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {segment.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="text-xs text-gray-500">
                Language: {segment.language.toUpperCase()}
              </div>

              {/* Expanded Details */}
              {selectedSegment === segment.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Start Time:</span>
                      <span className="ml-2 text-gray-600">{segment.startTime.toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">End Time:</span>
                      <span className="ml-2 text-gray-600">{segment.endTime.toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <span className="ml-2 text-gray-600">{segment.duration.toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Confidence:</span>
                      <span className="ml-2 text-gray-600">{(segment.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  {/* AI Insights */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">AI Insights:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Sentiment:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getSentimentColor(segment.sentiment)}`}>
                          {segment.sentiment}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Emotional Tone:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getEmotionalToneColor(segment.emotionalTone)}`}>
                          {segment.emotionalTone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {audioSegments.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{audioSegments.length}</div>
              <div className="text-sm text-gray-600">Total Segments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(audioSegments.reduce((sum, s) => sum + s.confidence, 0) / audioSegments.length * 100)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(audioSegments.map(s => s.sentiment)).size}
              </div>
              <div className="text-sm text-gray-600">Sentiment Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {audioSegments.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s
              </div>
              <div className="text-sm text-gray-600">Total Duration</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
