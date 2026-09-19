/**
 * Browser-side image compression before multipart upload.
 * Shrinks large phone photos so Cloudflare R2 transfer finishes much faster.
 */

const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_QUALITY = 0.78;
const SKIP_BELOW_BYTES = 350 * 1024; // already small enough

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

const getOutputType = (file) => {
  if (file.type === "image/png") {
    return "image/png";
  }
  if (file.type === "image/webp") {
    return "image/webp";
  }
  return "image/jpeg";
};

const renameToMatchType = (name, type) => {
  const base = String(name || "image").replace(/\.[^.]+$/, "");
  if (type === "image/png") return `${base}.png`;
  if (type === "image/webp") return `${base}.webp`;
  return `${base}.jpg`;
};

/**
 * Compress a single image File. Returns original if compression does not help.
 */
export const compressImageFile = async (
  file,
  {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
  } = {}
) => {
  if (!(file instanceof File) || !file.type?.startsWith("image/")) {
    return file;
  }

  if (file.size <= SKIP_BELOW_BYTES) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: file.type === "image/png" });
    if (!ctx) {
      return file;
    }

    ctx.drawImage(img, 0, 0, width, height);

    const outputType = getOutputType(file);
    const blob = await canvasToBlob(
      canvas,
      outputType,
      outputType === "image/png" ? undefined : quality
    );

    // Keep original if compressed result is not meaningfully smaller.
    if (blob.size >= file.size * 0.95) {
      return file;
    }

    return new File([blob], renameToMatchType(file.name, outputType), {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Image compression skipped:", error);
    return file;
  }
};

/**
 * Compress many images in parallel.
 */
export const compressImageFiles = async (files = [], options = {}) => {
  const list = Array.isArray(files) ? files : [];
  return Promise.all(list.map((file) => compressImageFile(file, options)));
};
