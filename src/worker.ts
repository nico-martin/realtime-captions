import {
  full,
  PreTrainedTokenizer,
  Processor,
  PreTrainedModel,
  AutoTokenizer,
  AutoProcessor,
  WhisperForConditionalGeneration,
  TextStreamer,
} from "@huggingface/transformers";
import {
  FileLoadingCallbackData,
  WorkerRequest,
  WorkerResponse,
} from "./types.ts";

const postMessage = (e: WorkerResponse) => self.postMessage(e);
const onMessage = (cb: (e: MessageEvent<WorkerRequest>) => void) =>
  self.addEventListener("message", cb);

class ModelInstance {
  private static instance: ModelInstance = null;
  private tokenizer: PreTrainedTokenizer;
  private processor: Processor;
  private model: PreTrainedModel;

  public static getInstance() {
    if (!this.instance) {
      this.instance = new ModelInstance();
    }
    return this.instance;
  }

  public async loadModel(
    callback: (data: FileLoadingCallbackData) => void,
  ): Promise<{
    tokenizer: PreTrainedTokenizer;
    processor: Processor;
    model: PreTrainedModel;
  }> {
    if (this.tokenizer && this.processor && this.model) {
      return {
        tokenizer: this.tokenizer,
        processor: this.processor,
        model: this.model,
      };
    }
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
    return {
      tokenizer: this.tokenizer,
      processor: this.processor,
      model: this.model,
    };
  }
}

onMessage(async (event) => {
  const instance = ModelInstance.getInstance();
  const log = (...e: Array<any>) =>
    event.data.log ? console.log("[WORKER]", ...e) : null;

  const { model, tokenizer, processor } = await instance.loadModel(
    (data: FileLoadingCallbackData) => {
      log("fileProgress", data);
      postMessage({
        status: "progress",
        file: data,
        id: event.data.id,
      });
    },
  );

  postMessage({
    status: "ready",
    id: event.data.id,
  });

  if (!event.data.audio) {
    log("no audio");
    postMessage({
      status: "complete",
      text: "",
      id: event.data.id,
    });
    return;
  }

  try {
    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      // @ts-ignore
      skip_special_tokens: true,
      callback_function: () => {},
    });

    const inputs = await processor(event.data.audio);

    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: event.data?.maxNewTokens || 64,
      language: event.data.language,
      streamer,
    });

    // @ts-ignore
    const outputText = tokenizer.batch_decode(outputs, {
      skip_special_tokens: true,
    });

    log("complete", outputText.join(" "));
    postMessage({
      status: "complete",
      text: outputText.join(" "),
      id: event.data.id,
    });
  } catch (error) {
    log("ERROR", error);
    postMessage({
      status: "error",
      error: error,
      id: event.data.id,
    });
  }
});
