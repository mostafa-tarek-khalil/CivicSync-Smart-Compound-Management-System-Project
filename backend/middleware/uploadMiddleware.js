const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const multer = require("multer");

/**
 * Local disk storage for user uploads (profile pictures, maintenance ticket
 * attachments).
 *
 * Files land in `backend/uploads/<folder>` and are served back through the
 * static mount declared in `index.js` at `/uploads/...`. MongoDB only ever
 * stores the relative URL, never the bytes, so documents stay small.
 */

/** Absolute path of the uploads root, shared with the static mount in index.js. */
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const ensureDir = (directory) => {
    fs.mkdirSync(directory, { recursive: true });
    return directory;
};

ensureDir(UPLOAD_ROOT);

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Build a multer instance that stores files under `uploads/<folder>`.
 *
 * Filenames are randomised so two users uploading `photo.jpg` never collide,
 * and the extension is derived from the *validated* mimetype rather than the
 * client-supplied filename (which is attacker-controlled).
 */
const createUploader = (folder) => {
    const destination = ensureDir(path.join(UPLOAD_ROOT, folder));

    const storage = multer.diskStorage({
        destination: (_req, _file, callback) => {
            callback(null, destination);
        },

        filename: (_req, file, callback) => {
            const extensionByMime = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp",
                "image/gif": ".gif",
            };

            const extension =
                extensionByMime[file.mimetype] ||
                path.extname(file.originalname).toLowerCase() ||
                ".bin";

            const uniqueName =
                crypto.randomBytes(16).toString("hex") + extension;

            callback(null, uniqueName);
        },
    });

    const fileFilter = (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            const error = new Error(
                "Only JPEG, PNG, WEBP or GIF images are allowed"
            );
            error.statusCode = 400;
            return callback(error);
        }

        return callback(null, true);
    };

    return multer({
        storage,
        fileFilter,
        limits: { fileSize: MAX_FILE_SIZE },
    });
};

/** Relative, publicly addressable URL for a stored file. */
const publicUrlFor = (folder, filename) =>
    `/uploads/${folder}/${filename}`;

module.exports = {
    UPLOAD_ROOT,
    createUploader,
    publicUrlFor,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
};