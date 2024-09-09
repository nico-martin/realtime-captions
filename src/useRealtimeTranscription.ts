import React from "react";
import getAudioFromChunks from "./utils/getAudioFromChunks.ts";
import loadModel from "./utils/loadModel.ts";
import transcribeAudio from "./utils/transcribeAudio.ts";

const MAX_NEW_TOKENS = 64;
const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 60; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

interface RealtimeTranscription {
  load: () => Promise<void>;
  destroy: () => void;
  start: (audioDeviceId: string) => Promise<void>;
  stop: () => void;
  output: string;
  tps: number;
}

const useRealtimeTranscription = (): RealtimeTranscription => {
  const [ready, setReady] = React.useState<boolean>(false);
  const audioContextRef = React.useRef<AudioContext>(null);
  const recorderRef = React.useRef<MediaRecorder>(null);
  const [recording, setRecording] = React.useState<boolean>(false);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [chunks, setChunks] = React.useState<Array<Blob>>([]);
  const [output, setOutput] = React.useState<string>("");

  const [tps, setTps] = React.useState<number>(0);

  React.useEffect(() => {
    if (!recorderRef.current) return;
    if (!recording) return;
    if (isProcessing) return;
    if (!ready) return;

    if (chunks.length > 0) {
      getAudioFromChunks(
        chunks,
        MAX_SAMPLES,
        recorderRef.current,
        audioContextRef.current,
      ).then((audio) => generate(audio));
    } else {
      recorderRef.current?.requestData();
    }
  }, [ready, recording, isProcessing, chunks]);

  const generate = async (audio: Float32Array, language: string = "en") => {
    setIsProcessing(true);
    recorderRef.current?.requestData();
    const output = await transcribeAudio(
      audio,
      language,
      MAX_NEW_TOKENS,
      setTps,
    );
    setIsProcessing(false);
    setOutput(output);
  };

  const setUpAudio = async (audioDeviceId: string) => {
    if (recorderRef.current) return; // Already set
    if (!navigator.mediaDevices.getUserMedia) {
      throw "getUserMedia not supported on your browser!";
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: audioDeviceId },
    });

    recorderRef.current = new MediaRecorder(stream);
    audioContextRef.current = new AudioContext({
      sampleRate: WHISPER_SAMPLING_RATE,
    });

    recorderRef.current.onstart = () => {
      setRecording(true);
      setChunks([]);
    };

    recorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        setChunks((prev) => [...prev, e.data]);
      } else {
        // Empty chunk received, so we request new data after a short timeout
        setTimeout(() => {
          recorderRef.current.requestData();
        }, 25);
      }
    };

    recorderRef.current.onstop = () => {
      setRecording(false);
    };
  };

  const destroyAudio = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const load = async () => {
    if (ready) return;
    await loadModel(console.log);
    setReady(true);
  };

  const start = async (audioDeviceId: string) => {
    await load();
    await setUpAudio(audioDeviceId);
    recorderRef.current.start();
  };

  return {
    load,
    destroy: destroyAudio,
    start,
    stop: () => {
      recorderRef?.current?.stop();
    },
    output,
    tps,
  };
};

export default useRealtimeTranscription;
