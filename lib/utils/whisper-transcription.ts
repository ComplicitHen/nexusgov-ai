/**
 * Whisper API Transcription Utility
 *
 * Handles audio transcription using OpenAI's Whisper API
 * Supports Swedish language and various audio formats
 */

import OpenAI from 'openai';
import { Readable } from 'stream';

// Initialize OpenAI client for Whisper
const openai = new OpenAI({
  apiKey: process.env.WHISPER_API_KEY || process.env.OPENROUTER_API_KEY,
});

export interface TranscriptionOptions {
  language?: string; // ISO 639-1 code (e.g., 'sv' for Swedish)
  prompt?: string; // Optional context to guide the transcription
  temperature?: number; // 0-1, controls randomness
  timestampGranularities?: ('word' | 'segment')[];
}

export interface TranscriptionResult {
  text: string;
  duration?: number; // in seconds
  language?: string;
  segments?: TranscriptionSegment[];
  words?: TranscriptionWord[];
}

export interface TranscriptionSegment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface TranscriptionWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
}

/**
 * Transcribe audio file using Whisper API
 *
 * @param audioFile - File object or Buffer containing audio data
 * @param fileName - Name of the file (for format detection)
 * @param options - Transcription options
 * @returns Transcription result with text and optional timestamps
 */
export async function transcribeAudio(
  audioFile: File | Buffer,
  fileName: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    // Validate file size (Whisper API limit is 25MB)
    const fileSize = audioFile instanceof File ? audioFile.size : audioFile.length;
    if (fileSize > 25 * 1024 * 1024) {
      throw new Error('Audio file exceeds 25MB limit. Please use a smaller file or compress the audio.');
    }

    // Validate file format
    const validFormats = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!validFormats.includes(fileExtension)) {
      throw new Error(`Unsupported audio format: ${fileExtension}. Supported formats: ${validFormats.join(', ')}`);
    }

    // Convert File to Buffer if needed
    let audioBuffer: Buffer;
    if (audioFile instanceof File) {
      const arrayBuffer = await audioFile.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } else {
      audioBuffer = audioFile;
    }

    // Create a File object for the API (convert Buffer to Uint8Array)
    const file = new File([new Uint8Array(audioBuffer)], fileName, {
      type: `audio/${fileExtension.substring(1)}`
    });

    console.log(`[Whisper] Transcribing audio: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Call Whisper API with verbose_json to get timestamps
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: options.language || 'sv', // Default to Swedish
      response_format: 'verbose_json', // Get detailed response with timestamps
      temperature: options.temperature || 0,
      timestamp_granularities: options.timestampGranularities || ['segment'],
    });

    console.log(`[Whisper] Transcription completed. Duration: ${response.duration || 'unknown'}s`);

    // Parse the response
    const result: TranscriptionResult = {
      text: response.text,
      duration: response.duration,
      language: response.language,
    };

    // Add segments if available
    if (response.segments && response.segments.length > 0) {
      result.segments = response.segments.map((seg: any) => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
      }));
    }

    // Add words if available
    if (response.words && response.words.length > 0) {
      result.words = response.words.map((word: any) => ({
        word: word.word,
        start: word.start,
        end: word.end,
      }));
    }

    return result;
  } catch (error) {
    console.error('[Whisper] Transcription error:', error);

    if (error instanceof Error) {
      // Handle specific API errors
      if (error.message.includes('API key')) {
        throw new Error('Whisper API key is not configured. Please set WHISPER_API_KEY in your environment.');
      }
      throw error;
    }

    throw new Error('Failed to transcribe audio. Please try again.');
  }
}

/**
 * Calculate transcription cost in SEK
 * Whisper API pricing: $0.006 USD per minute
 * Approximate exchange rate: 1 USD = 10 SEK
 *
 * @param durationSeconds - Duration of audio in seconds
 * @returns Cost in SEK
 */
export function calculateTranscriptionCost(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60);
  const usdPerMinute = 0.006;
  const sekPerUsd = 10; // Approximate exchange rate
  return minutes * usdPerMinute * sekPerUsd;
}

/**
 * Transcribe audio from a URL (Firebase Storage, etc.)
 *
 * @param audioUrl - URL to the audio file
 * @param fileName - Name of the file
 * @param options - Transcription options
 * @returns Transcription result
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  fileName: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    console.log(`[Whisper] Downloading audio from: ${audioUrl}`);

    // Download the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe the downloaded audio
    return await transcribeAudio(buffer, fileName, options);
  } catch (error) {
    console.error('[Whisper] Error downloading or transcribing audio:', error);
    throw error;
  }
}
