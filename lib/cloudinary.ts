// lib/cloudinary.ts
// Server-side Cloudinary configuration and upload utilities

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(base64: string, folder: string): Promise<{ url: string; publicId: string }> {
  try {
    const result = await cloudinary.uploader.upload(base64, {
      folder: folder,
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Cloudinary image upload failed: ${error.message}`);
    }
    throw new Error("Cloudinary image upload failed with an unknown error.");
  }
}

export async function uploadVideo(base64: string, folder: string): Promise<{ url: string; publicId: string }> {
  try {
    const result = await cloudinary.uploader.upload(base64, {
      folder: folder,
      resource_type: "video",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Cloudinary video upload failed: ${error.message}`);
    }
    throw new Error("Cloudinary video upload failed with an unknown error.");
  }
}

/**
 * Deletes an image from Cloudinary by its public_id.
 * Silently swallows errors — a missing asset should never block a DB delete.
 */
export async function deleteImage(publicId: string, resourceType: "image" | "video" = "image"): Promise<void> {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error: unknown) {
    // Log but don't re-throw — Cloudinary cleanup is best-effort
    if (error instanceof Error) {
      console.error(`[CLOUDINARY_DELETE_ERROR] ${error.message}`);
    }
  }
}
export async function uploadFile(file: string | Buffer, folder: string): Promise<{ url: string; publicId: string }> {
  try {
    // If it's a buffer, we need to use upload_stream or convert to base64
    // Cloudinary uploader.upload supports file path, url, or base64.
    // For buffers, we'll use a Promise wrapper around upload_stream.
    
    if (Buffer.isBuffer(file)) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "auto" },
          (error, result) => {
            if (error || !result) {
              reject(new Error(`Cloudinary upload failed: ${error?.message || "Unknown error"}`));
            } else {
              resolve({ url: result.secure_url, publicId: result.public_id });
            }
          }
        );
        uploadStream.end(file);
      });
    }

    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      resource_type: "auto",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
    throw new Error("Cloudinary upload failed with an unknown error.");
  }
}
