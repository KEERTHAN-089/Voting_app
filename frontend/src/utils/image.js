// Draws an image or video frame onto a canvas no larger than maxSize on its longest side
export const drawScaled = (source, width, height, maxSize) => {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
};

// Shrinks a chosen photo before upload so it is quick to send and cheap to store
export const resizeImageFile = (file, maxSize = 600, quality = 0.85) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight, maxSize);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not read this image'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image'));
    };
    img.src = url;
  });
