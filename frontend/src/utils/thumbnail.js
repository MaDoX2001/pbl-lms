const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
});

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const createVideoThumbnailDataUrl = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  const cleanup = () => {
    URL.revokeObjectURL(url);
    video.remove();
  };

  video.onloadedmetadata = () => {
    const seekTo = Math.min(1, Math.max(video.duration / 3, 0));
    video.currentTime = Number.isFinite(seekTo) ? seekTo : 0;
  };

  video.onseeked = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      cleanup();
      resolve(dataUrl);
    } catch (error) {
      cleanup();
      reject(error);
    }
  };

  video.onerror = (error) => {
    cleanup();
    reject(error);
  };
});

const createPdfThumbnailDataUrl = async (file) => {
  let pdfjs;
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch (error) {
    pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  }

  const data = await readFileAsArrayBuffer(file);
  const documentProxy = await pdfjs.getDocument({
    data,
    disableWorker: true
  }).promise;

  const page = await documentProxy.getPage(1);
  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85);
};

export const generateThumbnailBlob = async (file) => {
  if (!file) return null;

  let thumbnailDataUrl = null;
  const mimeType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();

  if (mimeType.startsWith('video/')) {
    thumbnailDataUrl = await createVideoThumbnailDataUrl(file);
  } else if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
    thumbnailDataUrl = await createPdfThumbnailDataUrl(file);
  } else {
    return null;
  }

  const blob = await dataUrlToBlob(thumbnailDataUrl);
  return new File([blob], `thumbnail-${Date.now()}.jpg`, { type: 'image/jpeg' });
};
