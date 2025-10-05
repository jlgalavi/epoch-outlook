import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      // Check if the browser supports the desired format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      console.log('Recording with format:', mimeType);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log('Audio chunk received:', e.data.size, 'bytes');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No recording in progress'));
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          console.log('Audio blob size:', audioBlob.size, 'bytes');
          console.log('Audio blob type:', audioBlob.type);
          
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            
            if (!base64Audio) {
              throw new Error('Failed to convert audio to base64');
            }

            console.log('Sending audio to transcription service...');

            // Send to transcription service
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio },
            });

            setIsTranscribing(false);

            if (error) {
              console.error('Transcription error:', error);
              throw error;
            }

            console.log('Transcription result:', data);
            const transcribedText = data?.text || '';
            console.log('Transcribed text:', transcribedText);
            
            if (!transcribedText) {
              toast({
                title: 'No speech detected',
                description: 'Please try speaking more clearly and closer to the microphone.',
              });
            }
            
            resolve(transcribedText);
          };
        } catch (error) {
          setIsTranscribing(false);
          console.error('Transcription error:', error);
          toast({
            title: 'Transcription failed',
            description: 'Could not transcribe audio. Please try again.',
            variant: 'destructive',
          });
          reject(error);
        }

        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.stop();
    });
  };

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
};
