import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

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
  await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
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
    await uploadBytes(r, files[i], {
      contentType: files[i].type || "image/jpeg",
    });
    urls.push(await getDownloadURL(r));
  }
  return urls;
}

/**
 * Seller KYC document (PAN / Aadhaar / GST). Same path as the app's
 * SellerApplicationScreen: seller_documents/{societyId}/{sellerId}/{docType}.{ext}
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
