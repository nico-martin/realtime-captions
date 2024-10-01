import React from "react";
import useRealtimeTranscription from "./useRealtimeCaptions.ts";
import { createRoot } from "react-dom/client";
import styles from "./App.module.css";
import "./styles/reset.css";
import "./styles/document.css";
import "./styles/colors.css";
import "./styles/grid.css";
import "./styles/fonts/font-woff2.css";
import "./styles/typography.css";
import Button from "./theme/Button/Button.tsx";
import { IconName } from "./theme/SVG/icons.ts";
import Icon from "./theme/SVG/Icon.tsx";

import pkg from "../package.json";

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
    // ask for audio device permission
    await navigator.mediaDevices.getUserMedia({ audio: true });

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(
      (device) => device.kind === "audioinput",
    );
    setAudioDevices(audioDevices);
  };

  React.useEffect(() => {
    //setupAudioDevices();
  }, []);

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <div className={styles.controls}>
          {state === State.IDLE || state === State.LOADING ? (
            <React.Fragment>
              <Button
                onClick={async () => {
                  setState(State.LOADING);
                  await transcription.load(activeAudioDevice);
                  setupAudioDevices();
                  setState(State.LOADED);
                }}
                loading={state === State.LOADING}
                round
                size="big"
                icon={IconName.DOWNLOAD}
              >
                load model
              </Button>
              <div className={styles.description}>
                <p>
                  This WebApp uses{" "}
                  <a href="https://huggingface.co/onnx-community/whisper-base">
                    whisper-base
                  </a>
                  , a 73 million parameter speech recognition model, with{" "}
                  <a
                    href="https://huggingface.co/docs/transformers.js/index"
                    target="_blank"
                  >
                    Transformers.js
                  </a>{" "}
                  and ONNX Runtime Web to transcribe everything you say directly
                  in the browser.
                  <br />
                  <b>No data is sent to a server!</b>
                </p>
                <p>
                  Furthermore, this application is open source and you can find
                  the source code on{" "}
                  <a
                    href="https://github.com/nico-martin/realtime-captions"
                    target="_blank"
                  >
                    GitHub
                  </a>
                  .
                </p>
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className={styles.selectMicWrapper}>
                <div className={styles.selectMicIconWrapper}>
                  <Icon
                    className={styles.selectMicIcon}
                    icon={IconName.MICROPHONE_OUTLINE}
                  />
                </div>
                <select
                  className={styles.selectMic}
                  //disabled={state !== State.IDLE}
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
              </div>
              <Button
                size="big"
                round
                onClick={async () => {
                  if (state === State.RUNNING) {
                    transcription.stop();
                    setState(State.LOADED);
                  } else if (state === State.LOADED) {
                    await transcription.start(activeAudioDevice);
                    setState(State.RUNNING);
                  } else {
                    setState(State.LOADING);
                    await transcription.load(activeAudioDevice);
                    setState(State.LOADED);
                  }
                }}
                icon={
                  state === State.RUNNING ? IconName.STOP : IconName.MICROPHONE
                }
              >
                {state === State.RUNNING
                  ? "stop"
                  : state === State.LOADED
                    ? "start"
                    : "..."}
              </Button>
            </React.Fragment>
          )}
        </div>
        <div className={styles.transcription}>
          <p>
            {transcription.output === "" ? (
              <i>waiting...</i>
            ) : (
              transcription.output
            )}
          </p>
        </div>
      </main>
      <footer className={styles.footer}>
        v.{pkg.version} - by{" "}
        <a href="https://nico.dev" target="_blank">
          Nico Martin
        </a>{" "}
        - code on{" "}
        <a
          href="https://github.com/nico-martin/realtime-captions"
          target="_blank"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
