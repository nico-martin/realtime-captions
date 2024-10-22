import getAudioFromChunks from "./utils/getAudioFromChunks.ts";
import LANGUAGES from "./utils/languages.ts";
import { WorkerResponse } from "./types.ts";
import { v4 as uuidv4 } from "uuid";

class RealtimeCaptions extends EventTarget {
  private worker: Worker;
  private audioContext: AudioContext;
  private recorder: MediaRecorder;
  private stream: MediaStream;
  public recording: boolean = false;
  private chunks: Array<Blob> = [];
  private modelReady: boolean = false;
  private modelBusy: boolean = false;
  private _tempOutput: string;
  private _outputArchive: Array<string> = [];
  private prevOutput: { count: number; output: string } = {
    count: 0,
    output: "",
  };
  private cutAudioAt: number = 0;
  private logger: (data: any) => any;
  public readonly languages = LANGUAGES;
  private language: string = "en";

  constructor(logCallback: (data: any) => any = null) {
    super();
    if (!navigator.mediaDevices.getUserMedia) {
      throw "getUserMedia not supported on your browser!";
    }

    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });

    if (logCallback) {
      this.logger = logCallback;
    }
  }

  get output() {
    const filteredArchive = this._outputArchive
      .filter(Boolean)
      .filter((str) => !str.startsWith(" ["));
    return {
      archive: filteredArchive,
      tempOutput: this._tempOutput,
      full: [...filteredArchive, this._tempOutput].join(" "),
    };
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
    return Boolean(this.modelReady && this.audioContext && this.recorder);
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
        this.maybeProcess();
      } else {
        setTimeout(() => this.recorder.requestData(), 25);
      }
    };

    this.recorder.onstop = () => {
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

  private generate = async (audio: Float32Array): Promise<string> =>
    new Promise((resolve, reject) => {
      this.modelBusy = true;
      const requestId = uuidv4();
      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;
        if (e.data.status === "complete") {
          this.worker.removeEventListener("message", listener);
          this.modelBusy = false;
          resolve(e.data.text);
        }
        if (e.data.status === "error") {
          this.worker.removeEventListener("message", listener);
          this.modelBusy = false;
          reject(e.data);
        }
      };
      this.worker.addEventListener("message", listener);
      this.worker.postMessage({
        id: requestId,
        audio,
        language: this.language,
      });
    });

  public destroyAudio = () => {
    this.stream && this.stream.getAudioTracks().map((track) => track.stop());
    this.recorder && this.recorder.stop();
    this.recorder = null;
  };

  private loadModel = (callback: (data: any) => void): Promise<void> =>
    new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;
        callback && callback(e.data);
        if (e.data.status === "complete") {
          this.worker.removeEventListener("message", listener);
          this.modelReady = true;
          resolve();
        }
        if (e.data.status === "error") {
          this.worker.removeEventListener("message", listener);
          reject(e.data);
        }
      };
      this.worker.addEventListener("message", listener);
      this.worker.postMessage({ id: requestId });
    });

  public setUp = async (audioDeviceId: string) => {
    if (this.ready) return;
    await this.loadModel(this.logger);
    await this.setUpAudio(audioDeviceId);
  };

  public start = async (
    audioDeviceId: string,
    language: string = this.language,
  ) => {
    const languageKeys = Object.values(LANGUAGES).map(({ value }) => value);
    if (!languageKeys.includes(language)) {
      throw new Error(`Language ${language} is not supported`);
    }

    this.language = language;
    await this.setUp(audioDeviceId);
    this.recorder.start();
  };

  public stop = () => {
    this.recorder.stop();
  };
}

export default RealtimeCaptions;
