import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});

const RAW_BUCKET =
  process.env.RAW_BUCKET || process.env.DOCUFLOW_DEV_RAW_BUCKET;
const EXPIRES_SECONDS = Number(
  process.env.PRESIGNED_EXPIRES_SECONDS || 300
);
const MAX_FILE_SIZE_BYTES = Number(
  process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024
);

const ALLOWED_MIME_TYPES = {
  "application/pdf": {
    fileExtension: "pdf",
    allowedOriginalExtensions: [".pdf"],
  },
  "image/jpeg": {
    fileExtension: "jpg",
    allowedOriginalExtensions: [".jpg", ".jpeg"],
  },
  "image/png": {
    fileExtension: "png",
    allowedOriginalExtensions: [".png"],
  },
};

export const handler = async (event) => {
  const method = getHttpMethod(event);

  log("INFO", { method, message: "Request received" });

  if (method === "OPTIONS") {
    return successResponse(200, null);
  }

  if (method !== "POST") {
    return errorResponse(
      405,
      "METHOD_NOT_ALLOWED",
      "Only POST is supported.",
      "API"
    );
  }

  const configurationError = validateConfiguration();
  if (configurationError) return configurationError;

  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Missing authenticated Cognito user.",
      "AUTH"
    );
  }

  try {
    const body = parseBody(event);

    if (body === null) {
      return errorResponse(
        400,
        "SCHEMA_VALIDATION_FAILED",
        "Request body must be valid JSON.",
        "SCHEMA_VALIDATION"
      );
    }

    const originalFileName = body.originalFileName;
    const mimeType = body.mimeType;
    const fileSizeBytes = Number(body.fileSizeBytes);
    const pageCount = Number(body.pageCount);
    const documentType = normalizeDocumentType(body.documentType);

    if (
      !originalFileName ||
      !mimeType ||
      body.fileSizeBytes === undefined ||
      body.pageCount === undefined
    ) {
      return errorResponse(
        400,
        "SCHEMA_VALIDATION_FAILED",
        "originalFileName, mimeType, fileSizeBytes, and pageCount are required.",
        "SCHEMA_VALIDATION"
      );
    }

    if (!isValidOriginalFileName(originalFileName)) {
      return errorResponse(
        400,
        "SCHEMA_VALIDATION_FAILED",
        "originalFileName is invalid.",
        "SCHEMA_VALIDATION"
      );
    }

    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
      return errorResponse(
        400,
        "SCHEMA_VALIDATION_FAILED",
        "fileSizeBytes must be a positive number.",
        "SCHEMA_VALIDATION"
      );
    }

    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        413,
        "FILE_TOO_LARGE",
        `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes.`,
        "VALIDATION"
      );
    }

    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      return errorResponse(
        400,
        "SCHEMA_VALIDATION_FAILED",
        "pageCount must be a positive integer.",
        "SCHEMA_VALIDATION"
      );
    }

    if (pageCount > 1) {
      return errorResponse(
        422,
        "MULTI_PAGE_REQUIRES_ASYNC_TEXTRACT",
        "Multi-page documents are not supported until the asynchronous Textract workflow is enabled.",
        "TEXTRACT_VALIDATION"
      );
    }

    if (body.documentType !== undefined && documentType === "UNKNOWN") {
      return errorResponse(
        400,
        "INVALID_DOCUMENT_TYPE",
        "documentType must be INVOICE or RECEIPT when provided.",
        "SCHEMA_VALIDATION"
      );
    }

    const mimeTypeConfig = ALLOWED_MIME_TYPES[mimeType];
    if (!mimeTypeConfig || !isExtensionMatched(originalFileName, mimeTypeConfig)) {
      return errorResponse(
        400,
        "INVALID_FILE_TYPE",
        "Only matching PDF, JPG, JPEG, and PNG file types are supported.",
        "VALIDATION"
      );
    }

    const documentId = `doc-${randomUUID()}`;
    const rawS3Key =
      `raw/${userId}/${documentId}/original.${mimeTypeConfig.fileExtension}`;
    const uploadMetadata = {
      "original-file-name": encodeURIComponent(originalFileName),
      "page-count": String(pageCount),
      "document-type": documentType,
      "declared-file-size": String(fileSizeBytes),
    };
    const putCommand = new PutObjectCommand({
      Bucket: RAW_BUCKET,
      Key: rawS3Key,
      ContentType: mimeType,
      Metadata: uploadMetadata,
    });
    const uploadUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: EXPIRES_SECONDS,
    });

    log("INFO", {
      documentId,
      userId,
      mimeType,
      fileSizeBytes,
      pageCount,
      documentType,
      rawS3Bucket: RAW_BUCKET,
      rawS3Key,
      status: "UPLOAD_URL_CREATED",
      message: "Presigned URL generated",
    });

    return successResponse(200, {
      documentId,
      uploadUrl,
      rawS3Key,
      expiresInSeconds: EXPIRES_SECONDS,
      uploadHeaders: {
        "Content-Type": mimeType,
        ...Object.fromEntries(
          Object.entries(uploadMetadata).map(([key, value]) => [
            `x-amz-meta-${key}`,
            value,
          ])
        ),
      },
    });
  } catch (error) {
    log("ERROR", {
      errorName: error?.name,
      errorMessage: error?.message,
      message: "Failed to generate presigned URL",
    });

    return errorResponse(
      500,
      "UNKNOWN_ERROR",
      "Could not generate upload URL.",
      "UPLOAD"
    );
  }
};

function apiResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
    },
    body: JSON.stringify(body),
  };
}

function successResponse(statusCode, data) {
  return apiResponse(statusCode, { success: true, data, error: null });
}

function errorResponse(
  statusCode,
  errorCode,
  errorMessage,
  errorStage = "VALIDATION"
) {
  return apiResponse(statusCode, {
    success: false,
    data: null,
    error: { errorCode, errorMessage, errorStage },
  });
}

function getHttpMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "";
}

function parseBody(event) {
  if (!event?.body) return {};

  let bodyText = event.body;
  if (event.isBase64Encoded) {
    bodyText = Buffer.from(event.body, "base64").toString("utf8");
  }
  if (typeof bodyText === "object" && bodyText !== null) return bodyText;

  try {
    const parsed = JSON.parse(bodyText);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function getUserId(event) {
  return (
    event?.requestContext?.authorizer?.jwt?.claims?.sub ||
    event?.requestContext?.authorizer?.claims?.sub ||
    null
  );
}

function normalizeDocumentType(value) {
  const type = String(value || "").trim().toUpperCase();
  return type === "INVOICE" || type === "RECEIPT" ? type : "UNKNOWN";
}

function validateConfiguration() {
  if (!RAW_BUCKET) {
    return errorResponse(
      500,
      "MISSING_ENVIRONMENT_VARIABLE",
      "RAW_BUCKET or DOCUFLOW_DEV_RAW_BUCKET environment variable is missing.",
      "CONFIGURATION"
    );
  }

  if (
    !Number.isInteger(EXPIRES_SECONDS) ||
    EXPIRES_SECONDS < 1 ||
    EXPIRES_SECONDS > 3600
  ) {
    return errorResponse(
      500,
      "INVALID_CONFIGURATION",
      "PRESIGNED_EXPIRES_SECONDS must be an integer between 1 and 3600.",
      "CONFIGURATION"
    );
  }

  if (!Number.isFinite(MAX_FILE_SIZE_BYTES) || MAX_FILE_SIZE_BYTES <= 0) {
    return errorResponse(
      500,
      "INVALID_CONFIGURATION",
      "MAX_FILE_SIZE_BYTES must be a positive number.",
      "CONFIGURATION"
    );
  }

  return null;
}

function isValidOriginalFileName(originalFileName) {
  return (
    typeof originalFileName === "string" &&
    Boolean(originalFileName.trim()) &&
    !originalFileName.includes("/") &&
    !originalFileName.includes("\\") &&
    originalFileName.length <= 255
  );
}

function isExtensionMatched(originalFileName, mimeTypeConfig) {
  const lowerFileName = originalFileName.toLowerCase();
  return mimeTypeConfig.allowedOriginalExtensions.some((extension) =>
    lowerFileName.endsWith(extension)
  );
}

function log(level, data) {
  const writer = level === "ERROR" ? console.error : console.log;
  writer(
    JSON.stringify({
      level,
      service: "docuflow-dev-api-generate-upload-url-lambda",
      ...data,
    })
  );
}
