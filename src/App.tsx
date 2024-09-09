import React from "react";
import useRealtimeTranscription from "./useRealtimeTranscription.ts";

enum State {
  IDLE = "IDLE",
  LOADED = "LOADED",
  LOADING = "LOADING",
  RUNNING = "RUNNING",
}

const App: React.FC = () => {
  const [state, setState] = React.useState<State>(State.IDLE);
  const transcription = useRealtimeTranscription();
  const [audioDevices, setAudioDevices] = React.useState<
    Array<MediaDeviceInfo>
  >([]);
  const [activeAudioDevice, setActiveAudioDevice] =
    React.useState<string>(null);

  const setupAudioDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(
      (device) => device.kind === "audioinput",
    );
    setAudioDevices(audioDevices);
  };

  React.useEffect(() => {
    setupAudioDevices();
  }, []);

  return (
    <div>
      <select
        disabled={state !== State.IDLE}
        style={{ width: "100%", padding: "0.3rem", borderRadius: "3px" }}
        onChange={(e) => setActiveAudioDevice(e.target.value)}
      >
        {audioDevices.map((device) => (
          <option
            selected={device.deviceId === activeAudioDevice}
            value={device.deviceId}
            key={device.deviceId}
          >
            {device.label}
          </option>
        ))}
      </select>
      <button
        disabled={state === State.LOADING}
        onClick={async () => {
          if (state === State.RUNNING) {
            transcription.stop();
            setState(State.LOADED);
          } else if (state === State.LOADED) {
            await transcription.start(activeAudioDevice);
            setState(State.RUNNING);
          } else {
            setState(State.LOADING);
            await transcription.load();
            setState(State.LOADED);
          }
        }}
      >
        {state === State.RUNNING
          ? "stop"
          : state === State.LOADED
            ? "start"
            : "load"}
      </button>
      {state !== State.IDLE && (
        <button
          onClick={async () => {
            transcription.stop();
            transcription.destroy();
            setState(State.IDLE);
          }}
        >
          destroy
        </button>
      )}
      <p>{transcription.output}</p>
      <p>{transcription.tps}</p>
    </div>
  );
};

export default App;
