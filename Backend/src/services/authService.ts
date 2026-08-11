import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { findUserByEmail, recordSuccessfulLogin } from "../repositories/authRepository";
import type { AuthUser, JwtPayload } from "../types/auth";
import type { LoginInput } from "../validators/authValidators";
import { ApiError } from "../utils/apiError";

type LoginMeta = {
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

type LoginResult = {
  token: string;
  expiresIn: string;
  user: AuthUser;
};

function issueToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: String(user.id),
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  const expiresIn = env.jwtExpiresIn as NonNullable<SignOptions["expiresIn"]>;
  const signOptions: SignOptions = { expiresIn };

  return jwt.sign(payload, env.jwtSecret, signOptions);
}

export async function login(input: LoginInput, meta: LoginMeta): Promise<LoginResult> {
  const account = await findUserByEmail(input.email);
  if (!account) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(input.password, account.passwordHash);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password");
  }

  const user: AuthUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role
  };

  await recordSuccessfulLogin(user.id, meta.ipAddress, meta.userAgent);

  return {
    token: issueToken(user),
    expiresIn: env.jwtExpiresIn,
    user
  };
}
