import {
  AutomaticSpeechRecognitionPipeline,
  env,
  pipeline,
} from "@xenova/transformers";
import getAudioFromChunks from "./utils/getAudioFromChunks.ts";

env.allowLocalModels = false;
env.useBrowserCache = false;

class SimpleTranscriber extends EventTarget {
  private transcriber: AutomaticSpeechRecognitionPipeline = null;
  private audioContext: AudioContext;
  private recorder: MediaRecorder;
  private stream: MediaStream;
  public recording: boolean = false;
  private chunks: Array<Blob> = [];
  private modelBusy: boolean = false;
  private _tps: number;
  private _tempOutput: string;
  private _outputArchive: Array<string> = [];
  private prevOutput: { count: number; output: string } = {
    count: 0,
    output: "",
  };
  private cutAudioAt: number = 0;
  private logger: (data: any) => any;
  private language: string = "en";

  constructor(language: string = "en", logCallback: (data: any) => any = null) {
    super();
    if (!navigator.mediaDevices.getUserMedia) {
      throw "getUserMedia not supported on your browser!";
    }
    if (logCallback) {
      this.logger = logCallback;
    }
    this.language = language;
  }

  get tps() {
    return this._tps;
  }

  set tps(tps) {
    this._tps = tps;
    this.dispatchEvent(new Event("tpsChanged"));
  }

  get output() {
    const filteredArchive = this._outputArchive
      .filter(Boolean)
      .filter((str) => !str.startsWith(" ["));
    return [...filteredArchive, this._tempOutput].join(" ");
  }

  set outputArchive(archive) {
    this._outputArchive = archive;
    this.dispatchEvent(new Event("outputChanged"));
  }
  set tempOutput(output) {
    this._tempOutput = output;
    this.dispatchEvent(new Event("outputChanged"));
  }

  get ready() {
    return this.transcriber && this.audioContext && this.recorder;
  }

  public setUpAudio = async (
    audioDeviceId: string,
    sampleRate: number = 16000,
  ) => {
    this.recorder && this.destroyAudio();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: audioDeviceId },
    });

    this.recorder = new MediaRecorder(this.stream);
    this.audioContext = new AudioContext({ sampleRate });

    this.recorder.onstart = () => {
      this.recording = true;
      this.recorder.requestData();
    };

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
        //this.maybeProcess();
      } else {
        setTimeout(() => this.recorder.requestData(), 25);
      }
    };

    this.recorder.onstop = () => {
      this.maybeProcess();
      this.recording = false;
    };
  };

  private maybeProcess = async () => {
    if (!this.ready) return;
    if (this.modelBusy) return;

    if (this.chunks.length > 0) {
      const audio = await getAudioFromChunks(
        this.chunks,
        this.recorder.mimeType,
        this.audioContext,
      );

      const output = await this.generate(
        audio.length > this.cutAudioAt ? audio.slice(this.cutAudioAt) : audio,
      );
      if (output === this.prevOutput.output) {
        this.prevOutput.count++;
        if (this.prevOutput.count > 3) {
          this.cutAudioAt = audio.length;
          this.tempOutput = "";
          this.outputArchive = [...this._outputArchive, output];
        } else {
          this.tempOutput = output;
        }
      } else {
        this.prevOutput = { count: 0, output };
        this.tempOutput = output;
      }
    }
    this.recorder?.requestData();
  };

  private generate = async (
    audio: Float32Array,
    language: string = this.language,
  ): Promise<string> => {
    this.modelBusy = true;
    const output = await this.transcriber(audio, { language });
    this.modelBusy = false;
    return Array.isArray(output)
      ? output.map(({ text }) => text).join(" ")
      : output.text;
  };

  public destroyAudio = () => {
    this.stream && this.stream.getAudioTracks().map((track) => track.stop());
    this.recorder && this.recorder.stop();
    this.recorder = null;
  };

  public setUp = async (audioDeviceId: string) => {
    if (this.ready) return;
    await this.loadModel(this.logger);
    await this.setUpAudio(audioDeviceId);
  };

  public start = async (audioDeviceId: string) => {
    await this.setUp(audioDeviceId);
    this.recorder.start();
  };

  public stop = () => {
    this.recorder.stop();
  };

  private loadModel = async (callback: (data: any) => void) => {
    if (!this.transcriber) {
      this.transcriber = await pipeline<"automatic-speech-recognition">(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        { progress_callback: console.log },
      );
    }
    return this.transcriber;
  };
}

export default SimpleTranscriber;
