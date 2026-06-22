import { useEffect, useRef, useState } from 'react';

export function useVoice(lang = 'es-ES') {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
    };
  }, [lang]);

  function start() {
    setTranscript('');
    setIsRecording(true);
    recognitionRef.current?.start();
  }

  function stop() {
    setIsRecording(false);
    recognitionRef.current?.stop();
  }

  return { isRecording, transcript, supported, start, stop };
}
