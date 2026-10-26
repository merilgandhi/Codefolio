import mongoose from 'mongoose';
import { DEFAULT_TEMPLATE_ID, STORED_TEMPLATE_IDS } from '../../shared/portfolio.js';
import { isEmail, isUsername, isWebUrl } from '../validation/portfolio.js';
import { normalizeDomain } from '../../shared/domains.js';

const { Schema } = mongoose;
const nestedOptions = { _id: false, strict: 'throw' };

function optionalUrl() {
  return {
    type: String,
    trim: true,
    default: '',
    maxlength: 2048,
    validate: {
      validator: isWebUrl,
      message: 'Use an absolute HTTP or HTTPS URL without credentials.',
    },
  };
}

function tags(maxItems) {
  return {
    type: [{ type: String, required: true, trim: true, maxlength: 50 }],
    default: [],
    castNonArrays: false,
    validate: {
      validator: (values) =>
        Array.isArray(values) &&
        values.length <= maxItems &&
        new Set(values.map((value) => value.toLowerCase())).size === values.length,
      message: `Use at most ${maxItems} distinct, nonempty tags.`,
    },
  };
}

const socialLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    url: { ...optionalUrl(), required: true },
  },
  nestedOptions,
);

const profileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    bio: { type: String, trim: true, default: '', maxlength: 2000 },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
      castNonArrays: false,
      validate: {
        validator: (values) => values.length <= 10,
        message: 'Use at most 10 social links.',
      },
    },
    resumeUrl: optionalUrl(),
  },
  nestedOptions,
);

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    techStack: tags(20),
    repoLink: optionalUrl(),
    liveLink: optionalUrl(),
    screenshot: optionalUrl(),
  },
  { strict: 'throw' },
); // Retain MongoDB subdocument IDs for stable project editing.

const skillsSchema = new Schema(
  {
    frontend: tags(40),
    backend: tags(40),
    devops: tags(40),
  },
  nestedOptions,
);

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: isUsername,
        message:
          'Use 3–30 letters, numbers, hyphens or underscores; start and end with a letter or number. This name may also be reserved.',
      },
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      select: false,
      validate: { validator: isEmail, message: 'Enter a valid email address.' },
    },
    // Hash creation/verification is handled by server/auth/passwords.js.
    // Never accept this field directly from a client request.
    passwordHash: { type: String, required: true, select: false, minlength: 60, maxlength: 512 },
    tier: { type: String, enum: ['free', 'pro'], default: 'free' },
    customDomain: {
      type: String,
      maxlength: 253,
      validate: {
        validator: (value) => value === undefined || normalizeDomain(value) === value,
        message: 'Use a canonical domain hostname.',
      },
    },
    templateId: { type: String, enum: STORED_TEMPLATE_IDS, default: DEFAULT_TEMPLATE_ID },
    profile: { type: profileSchema, required: true },
    projects: {
      type: [projectSchema],
      default: [],
      castNonArrays: false,
      validate: { validator: (values) => values.length <= 50, message: 'Use at most 50 projects.' },
    },
    skills: { type: skillsSchema, required: true, default: () => ({}) },
  },
  {
    timestamps: true,
    strict: 'throw',
    optimisticConcurrency: true,
    toJSON: {
      transform(_document, result) {
        delete result.email;
        delete result.passwordHash;
        delete result.__v;
        return result;
      },
    },
  },
);

// Uniqueness is enforced by MongoDB indexes, not Mongoose validation.
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
// Missing fields do not reserve a domain. Multiple Free/unconfigured users are valid.
userSchema.index(
  { customDomain: 1 },
  { unique: true, partialFilterExpression: { customDomain: { $type: 'string' } } },
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
