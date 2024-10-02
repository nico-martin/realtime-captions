![Realtime Captions](https://captions.nico.dev/twitter.jpg)

# Realtime Captions

This is an example of how we can use Transformers.js and WebGPU to run Whisper (whisper-base) directly in the browser to generate realtime captions.  

The RealtimeCaptions implementation was heavily influenced by the [WebGPU Whisper example](https://github.com/xenova/transformers.js/tree/v3/examples/webgpu-whisper) by [Xenova](https://github.com/xenova/) but comes with some improvements so no history is lost while still being as performant as possible.

This repository contains a [TypeScript Class](https://github.com/nico-martin/realtime-captions/blob/main/src/RealtimeCaptions.ts) that could be used with any framework as well as a [React Hook](https://github.com/nico-martin/realtime-captions/blob/main/app/useRealtimeCaptions.ts) abstraction used in the [demo application](https://github.com/nico-martin/realtime-captions/tree/main/app).