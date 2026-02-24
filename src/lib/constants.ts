export const DEVELOPERS = [
  "510 Pyro",
  "FX-39",
  "HC-110",
  "DDX",
  "Xtol",
  "Rodinal",
];

export const STEP_NAMES = ["DEV", "STOP", "FIX", "BLIX", "RINSE", "PRE", "WASH"];

export const AGITATION_OPTIONS = ["Roll", "Stick", "Stand", "Off"] as const;

export const COMPENSATION_OPTIONS = ["On", "Mon", "Off"] as const;

export const DEFAULT_SETTINGS = {
  ago_ip: "10.10.10.1",
  ago_ssid: "AGO",
  ago_password: "12345678",
  ago_upload_endpoint: "/api/files/programs/custom",
  ago_upload_field: "json",
  default_min_temp: "18",
  default_rated_temp: "20",
  default_max_temp: "24",
  export_folder: "",
  auto_reconnect: "true",
};

export function defaultStep(recipeId: string, sortOrder: number, name: string): {
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
  sort_order: number;
  recipe_id: string;
} {
  const isDev = name === "DEV";
  const defaultTimes: Record<string, number> = {
    DEV: 0, STOP: 1, FIX: 5, RINSE: 10,
  };
  return {
    recipe_id: recipeId,
    sort_order: sortOrder,
    name,
    time_min: defaultTimes[name] ?? 5,
    time_sec: 0,
    agitation: "Roll",
    compensation: isDev ? "On" : "Off",
    min_temperature: 18,
    rated_temperature: 20,
    max_temperature: 24,
    formula_designator: isDev ? "1.1.1" : "",
    logo_text: isDev ? "B&W DEV" : "",
  };
}

export const DEFAULT_TEMPLATE_STEPS = ["DEV", "STOP", "FIX", "RINSE"];
