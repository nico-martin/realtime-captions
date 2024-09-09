const getAudioFromChunks = (
  chunks: Array<Blob>,
  maxSamples: number,
  recorder: MediaRecorder,
  audioContext: AudioContext,
): Promise<Float32Array> =>
  new Promise((resolve) => {
    const blob = new Blob(chunks, { type: recorder.mimeType });

    const fileReader = new FileReader();

    fileReader.onloadend = async () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      let audio = decoded.getChannelData(0);
      if (audio.length > maxSamples) {
        // Get last MAX_SAMPLES
        audio = audio.slice(-maxSamples);
      }

      resolve(audio);
    };
    fileReader.readAsArrayBuffer(blob);
  });

export default getAudioFromChunks;
