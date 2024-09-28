import {
  full,
  PreTrainedTokenizer,
  Processor,
  PreTrainedModel,
  AutoTokenizer,
  AutoProcessor,
  WhisperForConditionalGeneration,
} from "@huggingface/transformers";
import getAudioFromChunks from "./utils/getAudioFromChunks.ts";
import transcribeAudio from "./utils/transcribeAudio.ts";

class RealtimeCaptions extends EventTarget {
  private audioContext: AudioContext;
  private recorder: MediaRecorder;
  private stream: MediaStream;
  public recording: boolean = false;
  private chunks: Array<Blob> = [];
  private tokenizer: PreTrainedTokenizer;
  private processor: Processor;
  private model: PreTrainedModel;
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
    return (
      this.tokenizer &&
      this.processor &&
      this.model &&
      this.audioContext &&
      this.recorder
    );
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

  private generate = async (
    audio: Float32Array,
    language: string = this.language,
  ): Promise<string> => {
    this.modelBusy = true;
    const output = await transcribeAudio(
      audio,
      language,
      64,
      this.tokenizer,
      this.processor,
      this.model,
      (tps) => {
        this.tps = tps;
      },
    );
    this.modelBusy = false;
    return output;
  };

  public destroyAudio = () => {
    this.stream && this.stream.getAudioTracks().map((track) => track.stop());
    this.recorder && this.recorder.stop();
    this.recorder = null;
  };

  private loadModel = async (callback: (data: any) => void) => {
    const modelId = "onnx-community/whisper-base";
    const tokenizerPromise = AutoTokenizer.from_pretrained(modelId, {
      progress_callback: callback,
    });

    const processorPromise = AutoProcessor.from_pretrained(modelId, {
      progress_callback: callback,
    });

    const modelPromise = WhisperForConditionalGeneration.from_pretrained(
      modelId,
      {
        dtype: {
          encoder_model: "fp32", // 'fp16' works too
          decoder_model_merged: "q4", // or 'fp32' ('fp16' is broken)
        },
        device: "webgpu",
        progress_callback: callback,
      },
    );

    const [tokenizer, processor, model] = await Promise.all([
      tokenizerPromise,
      processorPromise,
      modelPromise,
    ]);

    await model.generate({
      input_features: full([1, 80, 3000], 0.0),
      max_new_tokens: 1,
    });

    this.tokenizer = tokenizer;
    this.processor = processor;
    this.model = model;
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
}

export default RealtimeCaptions;
