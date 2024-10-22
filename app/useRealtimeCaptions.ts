import React from "react";
import RealtimeCaptions from "../src/RealtimeCaptions.ts";

const useRealtimeCaptions = (): {
  load: (audioDeviceId: string) => Promise<void>;
  destroy: () => void;
  start: (audioDeviceId: string, language?: string) => Promise<void>;
  stop: () => void;
  output: { archive: Array<string>; tempOutput: string; full: string };
  languages: Array<{ value: string; label: string }>;
} => {
  const [output, setOutput] = React.useState<{
    archive: Array<string>;
    tempOutput: string;
    full: string;
  }>({ archive: [], tempOutput: "", full: "" });
  const [realtimeCaptionsInstance, setRealtimeCaptionsInstance] =
    React.useState<RealtimeCaptions>(null);

  React.useEffect(() => {
    const realtimeCaptions = new RealtimeCaptions();
    realtimeCaptions.addEventListener("outputChanged", () =>
      setOutput(realtimeCaptions.output),
    );

    setRealtimeCaptionsInstance(realtimeCaptions);
    return () => {
      realtimeCaptions?.destroyAudio();
    };
  }, []);

  return {
    load: (audioDeviceId: string) =>
      realtimeCaptionsInstance?.setUp(audioDeviceId),
    destroy: realtimeCaptionsInstance?.destroyAudio,
    start: (audioDeviceId: string, language: string = null) =>
      realtimeCaptionsInstance?.start(audioDeviceId, language),
    stop: realtimeCaptionsInstance?.stop,
    output,
    languages: realtimeCaptionsInstance?.languages || [],
  };
};

export default useRealtimeCaptions;
