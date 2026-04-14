import {
  importLikedSongsFromFile,
  importLikedSongsFromStructuredList,
} from "../services/likedSongImport.service.js";
import { readFile } from "node:fs/promises";

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
};

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getImportOptions = (body = {}) => ({
  batchSize: parseNumber(body.batchSize),
  concurrency: parseNumber(body.concurrency),
  validateAudioHead: parseBoolean(body.validateAudioHead),
  deepSearch: parseBoolean(body.deepSearch),
  relaxedMatch: parseBoolean(body.relaxedMatch),
  persist: body.persist === undefined ? true : parseBoolean(body.persist),
});

const resolveUploadFileContent = async (selectedFile) => {
  if (!selectedFile) return "";

  if (selectedFile?.data instanceof Buffer && selectedFile.data.length > 0) {
    return selectedFile.data.toString("utf8");
  }

  if (typeof selectedFile?.tempFilePath === "string" && selectedFile.tempFilePath) {
    try {
      const tempFileBuffer = await readFile(selectedFile.tempFilePath);
      if (tempFileBuffer.length > 0) {
        return tempFileBuffer.toString("utf8");
      }
    } catch {
      // Ignore temp file read failures and continue fallback checks.
    }
  }

  if (typeof selectedFile?.data === "string" && selectedFile.data.length > 0) {
    return selectedFile.data;
  }

  if (selectedFile?.data) {
    try {
      return Buffer.from(selectedFile.data).toString("utf8");
    } catch {
      return "";
    }
  }

  return "";
};

const readUploadPayload = async (req) => {
  if (req.file?.buffer) {
    return {
      fileName: req.file.originalname,
      fileContent: req.file.buffer.toString("utf8"),
    };
  }

  if (req.files?.file) {
    const incoming = req.files.file;
    const selectedFile = Array.isArray(incoming) ? incoming[0] : incoming;
    const fileContent = await resolveUploadFileContent(selectedFile);

    return {
      fileName: selectedFile?.name,
      fileContent,
    };
  }

  if (req.body?.fileName && typeof req.body?.fileContent === "string") {
    return {
      fileName: req.body.fileName,
      fileContent: req.body.fileContent,
    };
  }

  return null;
};

export const importLikedSongsFileController = async (req, res) => {
  try {
    if (!req.auth?.uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const payload = await readUploadPayload(req);
    if (!payload?.fileName || !payload.fileContent) {
      return res.status(400).json({
        success: false,
        message:
          "No import file provided. Send multipart form-data with a CSV/TXT file in `file`.",
      });
    }

    const report = await importLikedSongsFromFile({
      userId: req.auth.uid,
      fileName: payload.fileName,
      fileContent: payload.fileContent,
      options: getImportOptions(req.body),
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    const message = error?.message || "Failed to import liked songs from file";
    const statusCode = /csv|txt|supported|provided/i.test(message) ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: "Failed to import liked songs from file",
      error:
        process.env.NODE_ENV === "production" ? undefined : message,
    });
  }
};

export const retryLikedSongImportController = async (req, res) => {
  try {
    if (!req.auth?.uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const failedSongs = Array.isArray(req.body?.failedSongs)
      ? req.body.failedSongs
      : Array.isArray(req.body?.songs)
      ? req.body.songs
      : [];

    if (!failedSongs.length) {
      return res.status(400).json({
        success: false,
        message: "Provide `failedSongs` (or `songs`) array for retry.",
      });
    }

    const normalizedRetrySongs = failedSongs.map((song) => ({
      title: song?.title || "",
      artist: song?.artist || "",
      album: song?.album || "",
      addedAt: song?.addedAt || song?.likedAt || "",
    }));

    const report = await importLikedSongsFromStructuredList({
      userId: req.auth.uid,
      songs: normalizedRetrySongs,
      options: getImportOptions(req.body),
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    const message = error?.message || "Failed to retry liked song import";
    const statusCode = /failedsongs|songs|array|provided/i.test(message)
      ? 400
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: "Failed to retry liked song import",
      error:
        process.env.NODE_ENV === "production" ? undefined : message,
    });
  }
};
