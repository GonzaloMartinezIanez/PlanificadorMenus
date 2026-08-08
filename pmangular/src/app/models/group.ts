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