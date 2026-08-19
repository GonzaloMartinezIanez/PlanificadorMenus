import { Ingredient } from './ingredient';

export interface ListModel {
  ingredient: Ingredient;
  amount: string;
  unit: string;
  bought: boolean;
  packages_needed: number;
  purchase_label: string;
}

export interface ListItem {
  id_ingredient: string;
  amount: number;
  unit: string;
}

export interface ListPatchItem {
  id_ingredient: string;
  amount?: number;
  unit?: string;
}

export interface ListStatusItem {
  id_ingredient: string;
  bought: boolean;
}
