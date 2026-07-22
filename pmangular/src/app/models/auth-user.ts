// Modelo con los atributos de un usuario
export interface AuthUser {
  id: number;
  username?: string;
  email?: string;
  profile_picture?: string | null;
  google_id?: string | null;
}
