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
import cn from "./utils/classnames.ts";

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
  const [activeLanguage, setActiveLanguage] = React.useState<string>("en");
  const transcriptionRef = React.useRef<HTMLParagraphElement>(null);
  const transcriptionWrapperRef = React.useRef<HTMLDivElement>(null);

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
    if (!transcriptionRef.current) return;
    if (!transcriptionWrapperRef.current) return;
    const height = transcriptionRef.current.clientHeight;
    const wrapperHeight = transcriptionWrapperRef.current.clientHeight;
    if (height >= wrapperHeight) {
      transcriptionWrapperRef.current.scroll(0, height);
    }
  }, [transcription.output.archive, transcription.output.tempOutput]);

  React.useEffect(() => {}, []);

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
                load model (~200 MB)
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
              <div className={styles.selectWrapper}>
                <div className={styles.selectElement}>
                  <div className={styles.selectIconWrapper}>
                    <Icon
                      className={styles.selectMicIcon}
                      icon={IconName.MICROPHONE_OUTLINE}
                    />
                  </div>
                  <select
                    className={cn(styles.select, styles.selectMic)}
                    disabled={state === State.RUNNING}
                    onChange={(e) => setActiveAudioDevice(e.target.value)}
                    value={activeAudioDevice || ""}
                  >
                    {audioDevices.map((device) => (
                      <option value={device.deviceId} key={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.selectElement}>
                  <div className={styles.selectIconWrapper}>
                    <Icon
                      className={styles.selectMicIcon}
                      icon={IconName.TRANSLATE}
                    />
                  </div>
                  <select
                    className={cn(styles.select, styles.selectLang)}
                    disabled={state === State.RUNNING}
                    onChange={(e) => setActiveLanguage(e.target.value)}
                    value={activeLanguage}
                  >
                    {transcription.languages
                      .sort((a, b) => (a.label < b.label ? -1 : 1))
                      .map((language) => (
                        <option value={language.value} key={language.value}>
                          {language.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <Button
                size="big"
                round
                pulsate={state === State.RUNNING}
                onClick={async () => {
                  if (state === State.RUNNING) {
                    transcription.stop();
                    setState(State.LOADED);
                  } else if (state === State.LOADED) {
                    await transcription.start(
                      activeAudioDevice,
                      activeLanguage,
                    );
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
        <div className={styles.transcription} ref={transcriptionWrapperRef}>
          <p ref={transcriptionRef}>
            <span className={styles.transcriptionArchive}>
              {transcription.output.archive.join(" ")}
            </span>{" "}
            <span>{transcription.output.tempOutput}</span>
          </p>
        </div>
      </main>
      <footer className={styles.footer}>
        <p>
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
        </p>
      </footer>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
