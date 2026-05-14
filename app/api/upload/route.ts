import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage, uploadVideo, uploadFile } from "@/lib/cloudinary";
import { generateBlurDataUrl } from "@/lib/cloudinary-blur";

const ALLOWED_FOLDERS = [
  "miduka/products", 
  "miduka/categories", 
  "miduka/settings", 
  "miduka/reviews", 
  "miduka/branding",
  "miduka/hero/desktop",
  "miduka/hero/mobile",
  "miduka/hero/videos",
  "miduka/prescriptions" // Added for Optician suite
];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const contentType = req.headers.get("content-type") || "";
    
    let base64: string | null = null;
    let folder: string | null = null;
    let resourceType: "image" | "video" | "auto" = "image";
    let fileBuffer: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      folder = formData.get("folder") as string;
      
      if (!file || !folder) {
        return NextResponse.json({ error: "Missing file or folder" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      resourceType = "auto"; // Let Cloudinary decide for FormData uploads
    } else {
      const body = await req.json();
      base64 = body.base64;
      folder = body.folder;
      resourceType = body.resourceType || "image";
    }

    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    // RBAC
    const isStoreOwner = session?.user?.role === "STORE_OWNER";
    const isReviewFolder = folder === "miduka/reviews";
    const isPrescriptionFolder = folder === "miduka/prescriptions";

    // Allow Store Owners to upload anywhere.
    // Allow authenticated users to upload reviews.
    // Allow anyone (including guests) to upload prescriptions (for guest checkout).
    if (!isStoreOwner && !isReviewFolder && !isPrescriptionFolder) {
      return NextResponse.json({ error: "Unauthorized for this folder" }, { status: 403 });
    }

    // Require session for non-prescription folders
    if (!isPrescriptionFolder && !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let result;
    if (fileBuffer) {
      result = await uploadFile(fileBuffer, folder);
    } else if (base64) {
      if (resourceType === "video") {
        result = await uploadVideo(base64, folder);
      } else {
        result = await uploadImage(base64, folder);
      }
    } else {
      return NextResponse.json({ error: "No file data provided" }, { status: 400 });
    }

    const { url, publicId } = result;
    
    // Only generate blur hash for images
    let blurDataUrl = null;
    const isImage = url.match(/\.(jpg|jpeg|png|webp|avif)$/i);
    if (isImage) {
      blurDataUrl = await generateBlurDataUrl(url);
    }

    return NextResponse.json({ url, publicId, blurDataUrl }, { status: 200 });
  } catch (error: unknown) {
    console.error("[UPLOAD_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
