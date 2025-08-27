import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface TranscriptionViewerProps {
  projectId: string;
  clipId?: string;
  className?: string;
}

interface Transcription {
  id: string;
  clip_id: string;
  user_id: string;
  text: string;
  language: string;
  confidence?: number;
  created_at: string;
  updated_at: string;
}

const TranscriptionViewer: React.FC<TranscriptionViewerProps> = ({ 
  projectId, 
  clipId, 
  className = '' 
}) => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);

  useEffect(() => {
    fetchTranscriptions();
  }, [projectId, clipId]);

  const fetchTranscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Since the transcriptions table doesn't have project_id, 
      // we need to get transcriptions by joining with video_clips
      let query;
      
      if (clipId) {
        // If we have a specific clip ID, query directly
        query = supabase
          .from('transcriptions')
          .select('*')
          .eq('clip_id', clipId);
      } else {
        // For project-level transcriptions, we need to get all clips for the project first
        // Then get transcriptions for those clips
        const { data: clips, error: clipsError } = await supabase
          .from('video_clips')
          .select('id')
          .eq('project_id', projectId);

        if (clipsError) {
          throw clipsError;
        }

        if (!clips || clips.length === 0) {
          setTranscriptions([]);
          return;
        }

        const clipIds = clips.map(clip => clip.id);
        
        query = supabase
          .from('transcriptions')
          .select('*')
          .in('clip_id', clipIds);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTranscriptions(data || []);
    } catch (err) {
      console.error('Error fetching transcriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transcriptions');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'Unknown';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatConfidence = (confidence?: number) => {
    if (!confidence) return 'Unknown';
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const downloadTranscription = async (transcription: Transcription) => {
    try {
      // Create a downloadable text file
      const blob = new Blob([transcription.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription_${transcription.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading transcription:', err);
      alert('Failed to download transcription');
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-600">Loading transcriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-gray-600">No transcriptions found</p>
          <p className="text-xs text-gray-500 mt-1">
            {clipId ? 'This clip has no transcription yet' : 'This project has no transcriptions yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Transcriptions ({transcriptions.length})
        </h3>
        <p className="text-sm text-gray-500">
          {clipId ? 'Clip transcriptions' : 'Project transcriptions'}
        </p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {transcriptions.map((transcription) => (
          <div key={transcription.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Clip Transcription
                  </span>
                  <span className="text-xs text-gray-500">
                    {transcription.language.toUpperCase()}
                  </span>
                  {transcription.confidence && (
                    <span className="text-xs text-gray-500">
                      Confidence: {formatConfidence(transcription.confidence)}
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-900 mb-3">
                  {selectedTranscription?.id === transcription.id ? (
                    <div>
                      <p className="whitespace-pre-wrap">{transcription.text}</p>
                      <button
                        onClick={() => setSelectedTranscription(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2"
                      >
                        Show less
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="line-clamp-3">
                        {transcription.text.length > 200 
                          ? `${transcription.text.substring(0, 200)}...` 
                          : transcription.text
                        }
                      </p>
                      {transcription.text.length > 200 && (
                        <button
                          onClick={() => setSelectedTranscription(transcription)}
                          className="text-blue-600 hover:text-blue-800 text-sm mt-2"
                        >
                          Show more
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500">
                  Created: {new Date(transcription.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => downloadTranscription(transcription)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptionViewer;
