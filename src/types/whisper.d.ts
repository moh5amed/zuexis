declare module 'whisper-web-transcriber' {
  export interface WhisperConfig {
    modelUrl?: string;
    modelSize?: 'tiny.en' | 'base.en' | 'tiny-en-q5_1' | 'base-en-q5_1';
    sampleRate?: number;
    audioIntervalMs?: number;
    onTranscription?: (text: string) => void;
    onProgress?: (progress: number) => void;
    onStatus?: (status: string) => void;
    debug?: boolean;
  }

  export interface WhisperTranscription {
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      confidence: number;
    }>;
  }

  export class WhisperTranscriber {
    constructor(config?: WhisperConfig);
    initialize(): Promise<void>;
    loadModel(): Promise<void>;
    startRecording(): Promise<void>;
    stopRecording(): void;
    destroy(): void;
  }
}
