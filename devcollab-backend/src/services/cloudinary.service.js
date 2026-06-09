import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

const getResourceType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "raw";
};

export const uploadBufferToCloudinary = ({ buffer, originalName, mimeType, folder }) => {
  return new Promise((resolve, reject) => {
    const resourceType = getResourceType(mimeType);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        filename_override: originalName
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(500, error.message || "Cloudinary upload failed"));
          return;
        }

        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async ({ publicId, resourceType = "raw" }) => {
  if (!publicId) {
    return null;
  }

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType
  });
};