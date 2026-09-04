import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Downscale an image to <= MAX_EDGE on its longest side and re-encode as JPEG,
 * so a seller's 5 MB phone photo becomes ~150 KB before it ever hits Storage
 * (benefits both web and the mobile app, which read the same object).
 * Non-images and anything already small pass through untouched.
 */
async function downscaleImage(file: File): Promise<Blob> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  if (scale === 1 && file.size < 400_000) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob(res, "image/jpeg", JPEG_QUALITY)
  );
  // If the re-encode somehow got bigger, keep the original.
  return blob && blob.size < file.size ? blob : file;
}

/**
 * Shop logo / banner upload. Same object paths as the mobile app
 * (shops/{shopId}/{logo|banner}.jpg) so both platforms overwrite the same file.
 */
export async function uploadShopImage(
  shopId: string,
  file: File,
  type: "logo" | "banner"
): Promise<string> {
  const r = ref(storage, `shops/${shopId}/${type}.jpg`);
  await uploadBytes(r, await downscaleImage(file), { contentType: "image/jpeg" });
  return getDownloadURL(r);
}

/**
 * Product images. Path products/{shopId}/{productId}/image_{i}.jpg — matches the
 * app's ProductStorageService multi-image layout.
 */
export async function uploadProductImages(
  shopId: string,
  productId: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const r = ref(storage, `products/${shopId}/${productId}/image_${i}.jpg`);
    await uploadBytes(r, await downscaleImage(files[i]), {
      contentType: "image/jpeg",
    });
    urls.push(await getDownloadURL(r));
  }
  return urls;
}

/**
 * Seller KYC document (PAN / Aadhaar / GST). Same path as the app's
 * SellerApplicationScreen: seller_documents/{societyId}/{sellerId}/{docType}.{ext}
 * Not downscaled — these can be PDFs and must stay legible.
 */
export async function uploadSellerDocument(
  societyId: string,
  sellerId: string,
  docType: "pan" | "aadhaar" | "gst",
  file: File
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const r = ref(
    storage,
    `seller_documents/${societyId}/${sellerId}/${docType}.${ext}`
  );
  await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
  return getDownloadURL(r);
}
