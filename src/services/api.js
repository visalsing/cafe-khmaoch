// MAIN FILE: keep importing from here, nothing else has to change:
//   import { mapService, assetUrl } from "../../services/api";
// The code lives in the files inside the api/ folder; this file only re-exports it.
export { assetUrl } from "./api/http.js";
export * from "./api/local.js";
export * from "./api/auth.js";
export * from "./api/genders.js";
export * from "./api/nationalities.js";
export * from "./api/menu.js";
export * from "./api/levels.js";
export * from "./api/pages.js";
export * from "./api/countryFlags.js";
export * from "./api/currencies.js";
export * from "./api/roles.js";
export * from "./api/positions.js";
export * from "./api/permissions.js";
export * from "./api/users.js";
export * from "./api/role_permissions.js";