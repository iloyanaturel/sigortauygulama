let workerPromise: Promise<import("tesseract.js").Worker> | null = null;
let progressCb: ((ratio: number) => void) | undefined;

function assetUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("tur", 1, {
        workerPath: assetUrl("/tesseract/worker.min.js"),
        corePath: assetUrl("/tesseract/tesseract-core-simd-lstm.wasm.js"),
        langPath: assetUrl("/tessdata"),
        gzip: true,
        workerBlobURL: false,
        logger: (msg) => {
          if (msg.status === "recognizing text" && typeof msg.progress === "number") {
            progressCb?.(msg.progress);
          }
        },
      });
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      return worker;
    })();
  }
  return workerPromise;
}

async function preprocess(source: Blob | HTMLCanvasElement | File | string): Promise<HTMLCanvasElement | Blob | string> {
  if (typeof window === "undefined") return source;
  if (typeof source === "string") return source;
  try {
    const bitmap = source instanceof HTMLCanvasElement ? source : await createImageBitmap(source);
    const scale = bitmap.width < 1400 ? Math.min(2.2, 1400 / Math.max(bitmap.width, 1)) : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return source instanceof HTMLCanvasElement ? source : source;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrast = gray < 170 ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = contrast;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  } catch {
    return source;
  }
}

export async function recognizeImage(
  source: Blob | HTMLCanvasElement | File | string,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  progressCb = onProgress;
  try {
    const worker = await getWorker();
    const prepared = await preprocess(source);
    const { data } = await worker.recognize(prepared);
    return data.text ?? "";
  } finally {
    progressCb = undefined;
  }
}
