# Realtime Captions
This is an example of how we can use Transformers.js and WebGPU to run Whisper (whisper-base) directly in the browser to generate realtime captions.  

The RealtimeCaptions implementation was heavily influenced by the [WebGPU Whisper example](https://github.com/xenova/transformers.js/tree/v3/examples/webgpu-whisper) by [Xenova](https://github.com/xenova/) but comes with some improvements so no history is lost while still being as performant as possible.