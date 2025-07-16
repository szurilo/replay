// renderer.js
// Continuously records the screen in a rolling 1-minute buffer and plays back after resume

if (!window.electronAPI) {
  throw new Error("Electron API not available");
}

const { desktopCapturer, ipcRenderer } = window.electronAPI;

let mediaRecorder;
let recordedChunks = [];
let recordingStartTime = null;
const MAX_DURATION_MS = 60 * 1000; // 1 minute

async function startScreenRecording() {
  try {
    console.log("Starting screen recording...");
    if (!desktopCapturer || !desktopCapturer.getSources) {
      throw new Error("desktopCapturer.getSources is not available");
    }

    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    console.log("Screen sources:", sources);

    if (!sources || sources.length === 0) {
      throw new Error("No screen sources found");
    }

    const screenSource = sources[0];
    console.log("Using screen source:", screenSource);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: screenSource.id,
        },
      },
    });

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
    });
    recordedChunks = [];
    recordingStartTime = Date.now();

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push({
          timestamp: Date.now(),
          data: event.data,
        });
        // Remove chunks older than 1 minute
        const cutoff = Date.now() - MAX_DURATION_MS;
        recordedChunks = recordedChunks.filter(
          (chunk) => chunk.timestamp >= cutoff
        );
      }
    };

    mediaRecorder.start(1000); // Collect data every second
  } catch (error) {
    console.error("Error in startScreenRecording:", error);
    throw error;
  }
}

function stopScreenRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

function playBackRecording() {
  if (recordedChunks.length === 0) return;
  const superBuffer = new Blob(
    recordedChunks.map((c) => c.data),
    { type: "video/webm" }
  );
  const video = document.createElement("video");
  video.controls = true;
  video.src = URL.createObjectURL(superBuffer);
  video.style.width = "100%";
  video.style.height = "100%";
  document.body.innerHTML = "";
  document.body.appendChild(video);
  video.play();
}

window.addEventListener("DOMContentLoaded", () => {
  startScreenRecording();

  ipcRenderer.on("system-resume", () => {
    stopScreenRecording();
    playBackRecording();
    setTimeout(() => {
      startScreenRecording();
    }, 2000); // Restart recording after playback
  });
});
