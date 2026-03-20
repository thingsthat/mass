/**
 * Helpers for image preview and file processing for upload.
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export type ProcessedImageFile = {
  data: string;
  mimeType: string;
  name: string;
};

/**
 * Create an object URL for a file to use as image preview. Call revokeImagePreview when done.
 */
export const createImagePreview = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revoke an object URL created by createImagePreview.
 */
export const revokeImagePreview = (url: string): void => {
  URL.revokeObjectURL(url);
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? (result.split(',')[1] ?? '') : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

/**
 * Process a FileList for upload: validate type/size and read as base64. Returns only valid image files.
 */
export const processMultipleFilesForUpload = async (
  files: FileList,
  maxSizeBytes: number
): Promise<ProcessedImageFile[]> => {
  const results: ProcessedImageFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) {
      continue;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      continue;
    }
    if (file.size > maxSizeBytes) {
      continue;
    }
    const data = await readFileAsBase64(file);
    results.push({
      data,
      mimeType: file.type,
      name: file.name,
    });
  }
  return results;
};
