import AutomaticSpeechRecognitionPipeline from "../AutomaticSpeechRecognitionPipeline.ts";
import { full } from "@huggingface/transformers";

const loadModel = async (callback: (data: any) => void) => {
  const [, , model] =
    await AutomaticSpeechRecognitionPipeline.getInstance(callback);

  await model.generate({
    input_features: full([1, 80, 3000], 0.0),
    max_new_tokens: 1,
  });
};

export default loadModel;
