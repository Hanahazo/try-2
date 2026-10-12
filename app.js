const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const drawingCanvas = document.querySelector('#drawingCanvas');
const previewFrame = document.querySelector('#previewFrame');
const emptyPreview = document.querySelector('#emptyPreview');
const cleanupSlider = document.querySelector('#cleanupSlider');
const contrastSlider = document.querySelector('#contrastSlider');
const cleanupValue = document.querySelector('#cleanupValue');
const contrastValue = document.querySelector('#contrastValue');
const modeTag = document.querySelector('#modeTag');
const statusText = document.querySelector('#statusText');
const downloadButton = document.querySelector('#downloadButton');
const displayButton = document.querySelector('#displayButton');
const resetButton = document.querySelector('#resetButton');
const cameraDialog = document.querySelector('#cameraDialog');
const cameraVideo = document.querySelector('#cameraVideo');
const captureButton = document.querySelector('#captureButton');
const cameraError = document.querySelector('#cameraError');
const aboutDialog = document.querySelector('#aboutDialog');
const sourceCanvas = document.createElement('canvas');
const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
const outputContext = drawingCanvas.getContext('2d', { willReadFrequently: true });

let activeMode = 'ink';
let sourceName = 'drawing';
let cameraStream = null;
let renderQueued = false;

function setSliderProgress(input) {
  input.style.setProperty('--range-progress', `${input.value}%`);
}

function loadDrawing(file) {
  if (!file || !file.type.startsWith('image/')) {
    statusText.textContent = 'Choose an image file to begin';
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    sourceContext.drawImage(image, 0, 0);
    sourceName = file.name.replace(/\.[^.]+$/, '') || 'drawing';
    URL.revokeObjectURL(imageUrl);
    renderDrawing();
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    statusText.textContent = 'That image could not be opened';
  };
  image.src = imageUrl;
}

function renderDrawing() {
  if (!sourceCanvas.width || renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    drawingCanvas.width = width;
    drawingCanvas.height = height;
    const source = sourceContext.getImageData(0, 0, width, height);
    const output = outputContext.createImageData(width, height);
    const cleanup = Number(cleanupSlider.value);
    const contrast = Number(contrastSlider.value);
    const cutoff = 112 + cleanup * 1.18;
    const contrastFactor = 1 + (contrast - 50) / 100;
    const saturation = 0.55 + contrast / 100 * 1.35;

    for (let pixel = 0; pixel < source.data.length; pixel += 4) {
      const red = source.data[pixel];
      const green = source.data[pixel + 1];
      const blue = source.data[pixel + 2];
      const lightness = red * 0.299 + green * 0.587 + blue * 0.114;
      let nextRed;
      let nextGreen;
      let nextBlue;

      if (activeMode === 'ink') {
        const edge = 10 + (100 - cleanup) * 0.12;
        const ink = Math.max(0, Math.min(1, (cutoff + edge / 2 - lightness) / edge));
        const value = Math.round(255 * (1 - ink));
        nextRed = value;
        nextGreen = value;
        nextBlue = value;
      } else if (activeMode === 'pencil') {
        const value = Math.max(0, Math.min(255, (lightness - 128) * contrastFactor + 128));
        nextRed = value;
        nextGreen = value;
        nextBlue = value;
      } else {
        nextRed = Math.max(0, Math.min(255, lightness + (red - lightness) * saturation));
        nextGreen = Math.max(0, Math.min(255, lightness + (green - lightness) * saturation));
        nextBlue = Math.max(0, Math.min(255, lightness + (blue - lightness) * saturation));
      }

      output.data[pixel] = nextRed;
      output.data[pixel + 1] = nextGreen;
      output.data[pixel + 2] = nextBlue;
      output.data[pixel + 3] = source.data[pixel + 3];
    }

    outputContext.putImageData(output, 0, 0);
    previewFrame.classList.add('has-image');
    emptyPreview.hidden = true;
    document.querySelector('#canvasInfo').hidden = false;
    document.querySelector('#imageDimensions').textContent = `${width} × ${height} PX`;
    statusText.textContent = sourceName;
    downloadButton.disabled = false;
    displayButton.disabled = false;
    resetButton.disabled = false;
  });
}

function resetAdjustments() {
  cleanupSlider.value = 58;
  contrastSlider.value = 50;
  cleanupValue.value = '58%';
  contrastValue.value = '50%';
  setSliderProgress(cleanupSlider);
  setSliderProgress(contrastSlider);
  setMode('ink');
  if (sourceCanvas.width) renderDrawing();
}

function setMode(mode) {
  activeMode = mode;
  const names = { ink: 'CLEAN INK', pencil: 'SOFT PENCIL', color: 'TRUE COLOR' };
  modeTag.textContent = names[mode];
  document.querySelectorAll('.mode-button').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (sourceCanvas.width) renderDrawing();
}

function closeCamera() {
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
  captureButton.disabled = true;
}

fileInput.addEventListener('change', (event) => loadDrawing(event.target.files[0]));
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});
document.querySelector('#emptyChooseButton').addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drag-over');
  loadDrawing(event.dataTransfer.files[0]);
});

document.querySelectorAll('.mode-button').forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});
cleanupSlider.addEventListener('input', () => {
  cleanupValue.value = `${cleanupSlider.value}%`;
  setSliderProgress(cleanupSlider);
  renderDrawing();
});
contrastSlider.addEventListener('input', () => {
  contrastValue.value = `${contrastSlider.value}%`;
  setSliderProgress(contrastSlider);
  renderDrawing();
});
setSliderProgress(cleanupSlider);
setSliderProgress(contrastSlider);

resetButton.addEventListener('click', resetAdjustments);
downloadButton.addEventListener('click', () => {
  if (!sourceCanvas.width) return;
  const link = document.createElement('a');
  link.download = `${sourceName}-paperplane.png`;
  link.href = drawingCanvas.toDataURL('image/png');
  link.click();
});
displayButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement === previewFrame) await document.exitFullscreen();
    else await previewFrame.requestFullscreen();
  } catch {
    statusText.textContent = 'Use your browser’s fullscreen control to display';
  }
});

document.querySelector('#cameraButton').addEventListener('click', async () => {
  cameraError.hidden = true;
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.textContent = 'Camera access needs a secure browser tab. Open this app on localhost or choose a photo instead.';
    cameraError.hidden = false;
    cameraDialog.showModal();
    return;
  }
  cameraDialog.showModal();
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    cameraVideo.srcObject = cameraStream;
    captureButton.disabled = false;
  } catch {
    cameraError.textContent = 'Camera permission was not available. You can still choose a photo from your device.';
    cameraError.hidden = false;
  }
});
captureButton.addEventListener('click', () => {
  if (!cameraVideo.videoWidth) return;
  const photo = document.createElement('canvas');
  photo.width = cameraVideo.videoWidth;
  photo.height = cameraVideo.videoHeight;
  photo.getContext('2d').drawImage(cameraVideo, 0, 0);
  sourceCanvas.width = photo.width;
  sourceCanvas.height = photo.height;
  sourceContext.drawImage(photo, 0, 0);
  sourceName = 'camera-drawing';
  closeCamera();
  cameraDialog.close();
  renderDrawing();
});
document.querySelector('#closeCameraButton').addEventListener('click', () => {
  closeCamera();
  cameraDialog.close();
});
cameraDialog.addEventListener('close', closeCamera);

document.querySelector('#helpButton').addEventListener('click', () => aboutDialog.showModal());
document.querySelector('#closeAboutButton').addEventListener('click', () => aboutDialog.close());
document.querySelector('#gotItButton').addEventListener('click', () => aboutDialog.close());