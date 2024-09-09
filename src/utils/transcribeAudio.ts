import AutomaticSpeechRecognitionPipeline from "../AutomaticSpeechRecognitionPipeline.ts";
import { TextStreamer } from "@huggingface/transformers";

const transcribeAudio = async (
  audio: Float32Array,
  language: string,
  maxNewTokens: number,
  tpsUpdateCallback: (tps: number) => void = () => {},
): Promise<string> => {
  const [tokenizer, processor, model] =
    await AutomaticSpeechRecognitionPipeline.getInstance();

  let startTime;
  let numTokens = 0;
  const callback_function = () => {
    startTime ??= performance.now();
    let tps;
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
    tpsUpdateCallback(tps);
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    // @ts-ignore
    skip_special_tokens: true,
    callback_function,
  });

  const inputs = await processor(audio);

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: maxNewTokens,
    language,
    streamer,
  });

  // @ts-ignore
  const outputText = tokenizer.batch_decode(outputs, {
    skip_special_tokens: true,
  });

  return outputText.join(" ");
};

export default transcribeAudio;
