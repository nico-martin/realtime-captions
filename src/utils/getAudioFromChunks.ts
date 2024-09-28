const getAudioFromChunks = (
  chunks: Array<Blob>,
  mimeType: string,
  audioContext: AudioContext,
): Promise<Float32Array> =>
  new Promise((resolve) => {
    const blob = new Blob(chunks, { type: mimeType });
    const fileReader = new FileReader();
    fileReader.onloadend = async () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      let audio = decoded.getChannelData(0);

      resolve(audio);
      resolve(null);
    };
    fileReader.readAsArrayBuffer(blob);
  });

export default getAudioFromChunks;
