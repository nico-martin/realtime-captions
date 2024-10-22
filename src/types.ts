export interface WorkerRequest {
  language?: string;
  maxNewTokens?: number;
  audio?: Float32Array;
  id: string;
  log?: boolean;
}

interface FileLoadingCallbackDataNormal {
  file: string;
  name: string;
  status: "initiate" | "progress" | "download" | "done";
}

interface FileLoadingCallbackDataProgress {
  file: string;
  name: string;
  status: "progress";
  progress?: number;
  loaded?: number;
  total?: number;
}

export type FileLoadingCallbackData =
  | FileLoadingCallbackDataNormal
  | FileLoadingCallbackDataProgress;

export type InitPipelineProgressEvent = {
  status: "progress";
  file: FileLoadingCallbackData;
  id: string;
};

export type PipelineReadyEvent = {
  status: "ready";
  id: string;
};

export type TranscribeErrorEvent = {
  status: "error";
  error: any;
  id: string;
};

export type CompleteEvent = {
  status: "complete";
  text: string;
  id: string;
};

export type WorkerResponse =
  | InitPipelineProgressEvent
  | PipelineReadyEvent
  | TranscribeErrorEvent
  | CompleteEvent;
