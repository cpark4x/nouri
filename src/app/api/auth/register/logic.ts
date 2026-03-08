import bcrypt from "bcryptjs";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface RegisterValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validates registration input. Returns error message if invalid.
 */
export function validateRegisterInput(
  input: RegisterInput,
): RegisterValidation {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  if (input.password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters",
    };
  }
  if (input.name.trim().length < 1) {
    return { valid: false, error: "Name is required" };
  }
  return { valid: true };
}

/**
 * Hashes a plaintext password using bcrypt with cost factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
