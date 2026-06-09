import mongoose from "mongoose";

const portfolioLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [60, "Portfolio link label cannot exceed 60 characters"]
    },
    url: {
      type: String,
      trim: true,
      maxlength: [500, "Portfolio link URL cannot exceed 500 characters"]
    }
  },
  {
    _id: false
  }
);

const developerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: [800, "Bio cannot exceed 800 characters"]
    },
    skills: {
      type: [String],
      default: []
    },
    interests: {
      type: [String],
      default: []
    },
    availabilityHoursPerWeek: {
      type: Number,
      default: 10,
      min: [0, "Availability cannot be negative"],
      max: [80, "Availability cannot exceed 80 hours per week"]
    },
    preferredRoles: {
      type: [String],
      default: []
    },
    experienceLevel: {
      type: String,
      enum: ["beginner", "junior", "mid", "senior", "lead"],
      default: "junior"
    },
    githubUsername: {
      type: String,
      default: "",
      trim: true,
      maxlength: [80, "GitHub username cannot exceed 80 characters"]
    },
    portfolioLinks: {
      type: [portfolioLinkSchema],
      default: []
    },
    timezone: {
      type: String,
      default: "",
      trim: true,
      maxlength: [80, "Timezone cannot exceed 80 characters"]
    }
  },
  {
    timestamps: true
  }
);

developerProfileSchema.index({ skills: 1 });
developerProfileSchema.index({ interests: 1 });
developerProfileSchema.index({ experienceLevel: 1 });

export const DeveloperProfile = mongoose.model("DeveloperProfile", developerProfileSchema);
