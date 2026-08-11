// Modelo con los atributos de un usuario
export interface GroupModel {
  group_code: string;
  group_name: string;
  group_description: string;
  creation_date: string;
}

export interface GroupShortModel {
  group_name: string;
  group_description: string;
}

export interface GroupMember{
  user_id: number;
  username: string;
  profile_picture: string;
  group_code: string;
  role: string;
  joining_date: string;
  accepted: boolean;
}