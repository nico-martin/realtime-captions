import React from "react";
import RealtimeCaptions from "../src/RealtimeCaptions.ts";

const useRealtimeCaptions = (): {
  load: (audioDeviceId: string) => Promise<void>;
  destroy: () => void;
  start: (audioDeviceId: string) => Promise<void>;
  stop: () => void;
  output: string;
  tps: number;
} => {
  const [output, setOutput] = React.useState<string>("");
  const [tps, setTps] = React.useState<number>(0);
  const [realtimeCaptionsInstance, setRealtimeCaptionsInstance] =
    React.useState<RealtimeCaptions>(null);

  React.useEffect(() => {
    const realtimeCaptions = new RealtimeCaptions();
    realtimeCaptions.addEventListener("outputChanged", () =>
      setOutput(realtimeCaptions.output),
    );
    realtimeCaptions.addEventListener("tpsChanged", () =>
      setTps(realtimeCaptions.tps),
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
    start: (audioDeviceId: string) =>
      realtimeCaptionsInstance?.start(audioDeviceId),
    stop: realtimeCaptionsInstance?.stop,
    output,
    tps,
  };
};

export default useRealtimeCaptions;
