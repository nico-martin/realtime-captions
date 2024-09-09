import {
  AutoTokenizer,
  AutoProcessor,
  WhisperForConditionalGeneration,
  PreTrainedTokenizer,
  Processor,
  PreTrainedModel,
} from "@huggingface/transformers";

class AutomaticSpeechRecognitionPipeline {
  static model_id: string = null;
  static tokenizer: Promise<PreTrainedTokenizer> = null;
  static processor: Promise<Processor> = null;
  static model: Promise<PreTrainedModel> = null;

  static async getInstance(progress_callback = null) {
    this.model_id = "onnx-community/whisper-base";

    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback,
    });
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= WhisperForConditionalGeneration.from_pretrained(
      this.model_id,
      {
        dtype: {
          encoder_model: "fp32", // 'fp16' works too
          decoder_model_merged: "q4", // or 'fp32' ('fp16' is broken)
        },
        device: "webgpu",
        progress_callback,
      },
    );

    return Promise.all([this.tokenizer, this.processor, this.model]);
  }
}

export default AutomaticSpeechRecognitionPipeline;
