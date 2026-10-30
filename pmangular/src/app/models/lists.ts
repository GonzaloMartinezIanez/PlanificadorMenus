import { Ingredient } from './ingredient';

export interface ListModel {
  ingredient: Ingredient;
  amount: number;
  unit: string;
  bought: boolean;
  packages_needed: number | null;
  purchase_label: string | null;
  calculated_price: number | null;
}

export interface ListResponse {
  items: ListModel[];
  total_price: number;
}

export interface ListItem {
  id_ingredient: string;
  amount: number;
  unit: string;
}

export interface ListPatchItem {
  expected_amount?: number;
  id_ingredient: string;
  amount?: number;
  unit?: string;
}

export interface ListItemSaveResult {
  success: boolean;
}

export interface ListStatusItem {
  id_ingredient: string;
  bought: boolean;
}
