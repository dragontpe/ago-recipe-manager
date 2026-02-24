export interface Recipe {
  id: string;
  name: string;
  film_stock: string;
  developer: string;
  dilution: string;
  category: string;
  notes: string;
  dev_time_reduced: number;
  created_at: string;
  updated_at: string;
  steps: Step[];
}

export interface Step {
  id: string;
  recipe_id: string;
  sort_order: number;
  name: string;
  time_min: number;
  time_sec: number;
  agitation: string;
  compensation: string;
  min_temperature: number;
  rated_temperature: number;
  max_temperature: number;
  formula_designator: string;
  logo_text: string;
}

export interface AgoRecipeJson {
  category: string;
  name: string;
  expanded_title: string;
  steps: AgoStepJson[];
}

export interface AgoStepJson {
  name: string;
  time_min: number;
  time_sec: number;
  agitation: string;
  compensation: string;
  min_temperature: number;
  rated_temperature: number;
  max_temperature: number;
  formula_designator: string;
  logo_text: string;
}

export interface MdcEntry {
  film: string;
  developer: string;
  dilution: string;
  iso: string;
  time_35mm: string;
  time_120: string;
  time_sheet: string;
  temp_c: string;
  notes: string;
}

export type ViewType = "recipes" | "massdev" | "connection" | "settings";

export type AgitationType = "Roll" | "Stick" | "Stand" | "Off";
export type CompensationType = "On" | "Mon" | "Off";

export interface AppSettings {
  ago_ip: string;
  ago_ssid: string;
  ago_password: string;
  ago_upload_endpoint: string;
  ago_upload_field: string;
  default_min_temp: string;
  default_rated_temp: string;
  default_max_temp: string;
  export_folder: string;
  auto_reconnect: string;
}
