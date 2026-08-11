import crypto from "node:crypto";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = crypto.createHmac("sha256", "AWS4" + key).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
  return kSigning;
}

export async function uploadProductImageToR2(
  fileBuffer: Buffer,
  originalFileName: string,
  contentType: string
): Promise<{ fullR2Url: string; proxyUrl: string }> {
  const endpoint = env.r2Endpoint.replace(/\/$/, "");
  const accessKeyId = env.r2AccessKeyId;
  const secretAccessKey = env.r2SecretAccessKey;
  const bucketName = env.r2BucketName;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new ApiError(500, "Cloudflare R2 storage credentials are not properly configured");
  }

  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueKey = `products/${Date.now()}-${sanitizedFileName}`;

  const urlObj = new URL(endpoint);
  const host = urlObj.host;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.substring(0, 8);
  const region = "auto";
  const service = "s3";

  const reqPath = `/${bucketName}/${uniqueKey}`;
  const payloadHash = sha256(fileBuffer);
  const validContentType = contentType || "image/jpeg";

  const canonicalHeaders = `content-type:${validContentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    reqPath,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fullUrl = `${endpoint}${reqPath}`;

  const response = await fetch(fullUrl, {
    method: "PUT",
    headers: {
      "Content-Type": validContentType,
      "Host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authorizationHeader
    },
    body: new Uint8Array(fileBuffer)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Cloudflare R2 Upload Failed:", response.status, errorText);
    throw new ApiError(500, `Failed to upload image to Cloudflare R2: ${response.statusText}`);
  }

  const proxyUrl = `/api/products/image-proxy?key=${encodeURIComponent(uniqueKey)}`;
  return { fullR2Url: fullUrl, proxyUrl };
}

export async function getImageFromR2(keyOrUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const endpoint = env.r2Endpoint.replace(/\/$/, "");
  const accessKeyId = env.r2AccessKeyId;
  const secretAccessKey = env.r2SecretAccessKey;
  const bucketName = env.r2BucketName;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new ApiError(500, "Cloudflare R2 storage credentials are not properly configured");
  }

  let cleanPath = keyOrUrl;
  if (cleanPath.includes("key=")) {
    const match = cleanPath.match(/key=([^&]+)/);
    if (match && match[1]) {
      cleanPath = decodeURIComponent(match[1]);
    }
  }

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    try {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
    } catch {
      // ignore
    }
  }

  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }
  if (!cleanPath.startsWith(`/${bucketName}`)) {
    cleanPath = `/${bucketName}${cleanPath}`;
  }

  const urlObj = new URL(endpoint);
  const host = urlObj.host;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.substring(0, 8);
  const region = "auto";
  const service = "s3";

  const payloadHash = sha256("");

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "GET",
    cleanPath,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fullUrl = `${endpoint}${cleanPath}`;

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      "Host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authorizationHeader
    }
  });

  if (!response.ok) {
    throw new ApiError(response.status === 404 ? 404 : 500, "Failed to retrieve image from Cloudflare R2");
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return { buffer: Buffer.from(arrayBuffer), contentType };
}
