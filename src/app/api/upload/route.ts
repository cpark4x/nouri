import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs/promises";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function generateFilename(contentType: string): string {
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const timestamp = Date.now();
  const suffix = randomBytes(6).toString("hex");
  return `${timestamp}-${suffix}.${ext}`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 },
    );
  }

  // Validate content type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are accepted" },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 },
    );
  }

  const filename = generateFilename(file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  // Azure Blob Storage if configured
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    try {
      const { BlobServiceClient } = await import("@azure/storage-blob");
      const blobService = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
      );
      const containerName = process.env.AZURE_STORAGE_CONTAINER ?? "uploads";
      const containerClient = blobService.getContainerClient(containerName);
      await containerClient.createIfNotExists({ access: "blob" });

      const blockBlob = containerClient.getBlockBlobClient(filename);
      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: file.type },
      });

      return NextResponse.json({ url: blockBlob.url });
    } catch (error) {
      console.error("Azure upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 },
      );
    }
  }

  // Local fallback: save to public/uploads/
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Local upload error:", error);
    return NextResponse.json(
      { error: "Failed to save image" },
      { status: 500 },
    );
  }
}