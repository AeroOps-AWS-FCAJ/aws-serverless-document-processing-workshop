import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.DOCUFLOW_DEV_TABLE_NAME;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const ALLOWED_STATUSES = new Set([
  "UPLOADED",
  "QUEUED",
  "PROCESSING",
  "EXTRACTED",
  "REVIEW_REQUIRED",
  "FAILED",
  "CORRECTED",
  "APPROVED",
]);

export const handler = async (event) => {
  try {
    const method = event?.requestContext?.http?.method || event?.httpMethod || "";

    if (method === "OPTIONS") {
      return formatResponse(200, true, null);
    }

    if (method !== "GET") {
      return formatResponse(
        405,
        false,
        null,
        "Only GET is supported.",
        "API",
        "METHOD_NOT_ALLOWED"
      );
    }

    if (!TABLE_NAME) {
      return formatResponse(
        500,
        false,
        null,
        "DOCUFLOW_DEV_TABLE_NAME environment variable is missing.",
        "CONFIGURATION",
        "MISSING_ENVIRONMENT_VARIABLE"
      );
    }

    const userId = getUserId(event);
    if (!userId) {
      return formatResponse(
        401,
        false,
        null,
        "Missing authenticated Cognito user.",
        "AUTH",
        "UNAUTHORIZED"
      );
    }

    const query = event?.queryStringParameters || {};
    const statusFilter = String(query.status || "").trim().toUpperCase();
    if (statusFilter && !ALLOWED_STATUSES.has(statusFilter)) {
      return formatResponse(
        400,
        false,
        null,
        "Unsupported document status.",
        "VALIDATION",
        "INVALID_STATUS"
      );
    }

    let exclusiveStartKey;
    try {
      exclusiveStartKey = decodeNextToken(query.nextToken, userId);
    } catch {
      return formatResponse(
        400,
        false,
        null,
        "Invalid nextToken.",
        "VALIDATION",
        "INVALID_NEXT_TOKEN"
      );
    }

    const pageSize = normalizePageSize(query.limit);
    const expressionAttributeNames = statusFilter
      ? { "#status": "status" }
      : undefined;
    const expressionAttributeValues = {
      ":pk": `USER#${userId}`,
      ":documentPrefix": "DOC#",
      ...(statusFilter ? { ":status": statusFilter } : {}),
    };
    const queryInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :documentPrefix)",
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      FilterExpression: statusFilter ? "#status = :status" : undefined,
      ExclusiveStartKey: exclusiveStartKey,
      Limit: pageSize,
    };

    const result = await docClient.send(new QueryCommand(queryInput));
    const items = (result.Items || []).map(removeDynamoDbKeys);

    log("INFO", {
      message: "Documents listed successfully",
      userId,
      statusFilter: statusFilter || null,
      itemCount: items.length,
    });

    return formatResponse(200, true, {
      items,
      nextToken: encodeNextToken(result.LastEvaluatedKey),
    });
  } catch (error) {
    log("ERROR", {
      message: "Failed to list documents",
      errorName: error?.name,
      errorMessage: error?.message,
    });

    return formatResponse(
      500,
      false,
      null,
      error?.message || "Unknown error.",
      "DYNAMODB",
      "UNKNOWN_ERROR"
    );
  }
};

function getUserId(event) {
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims ||
    {};

  return claims.sub || null;
}

function normalizePageSize(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(numeric, MAX_PAGE_SIZE);
}

function encodeNextToken(lastEvaluatedKey) {
  if (!lastEvaluatedKey) return null;
  return Buffer.from(JSON.stringify(lastEvaluatedKey), "utf8").toString(
    "base64url"
  );
}

function decodeNextToken(token, userId) {
  if (!token) return undefined;
  const decoded = JSON.parse(
    Buffer.from(String(token), "base64url").toString("utf8")
  );
  if (
    !decoded ||
    decoded.PK !== `USER#${userId}` ||
    typeof decoded.SK !== "string" ||
    !decoded.SK.startsWith("DOC#")
  ) {
    throw new Error("Invalid nextToken scope.");
  }
  return decoded;
}

function removeDynamoDbKeys(item = {}) {
  const { PK, SK, GSI1PK, GSI1SK, ...safeItem } = item;
  return safeItem;
}

function formatResponse(
  statusCode,
  success,
  data,
  errorMessage = null,
  errorStage = null,
  errorCode = "UNKNOWN_ERROR"
) {
  const body = { success, data, error: null };

  if (errorMessage) {
    body.error = { errorCode, errorMessage, errorStage };
  }

  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function log(level, data) {
  const writer = level === "ERROR" ? console.error : console.log;
  writer(
    JSON.stringify({
      level,
      service: "docuflow-dev-data-list-documents-lambda",
      ...data,
    })
  );
}
