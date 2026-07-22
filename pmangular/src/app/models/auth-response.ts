import { AuthUser } from "./auth-user";

export interface AuthResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}
