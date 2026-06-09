import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

export const validateMongoId = (id, fieldName = "id") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
};