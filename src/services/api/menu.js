import { http } from "./http.js";

/* Menu: categories, drinks types, products */

export const categoryService = {
  list: () => http("/categories"),
  create: (formData) => http("/categories", { method: "POST", body: formData }),
  update: (id, formData) => http(`/categories/${id}`, { method: "PUT", body: formData }),
  remove: (id) => http(`/categories/${id}`, { method: "DELETE" }),
};

export const drinksTypesService = {
  list: () => http("/drinks-types"),
  create: (formData) => http("/drinks-types", { method: "POST", body: formData }),
  update: (id, formData) => http(`/drinks-types/${id}`, { method: "PUT", body: formData }),
  remove: (id) => http(`/drinks-types/${id}`, { method: "DELETE" }),
};

export const productService = {
  list: () => http("/products"),
  create: (formData) => http("/products", { method: "POST", body: formData }),
  update: (id, formData) => http(`/products/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/products/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/products/${id}`, { method: "DELETE" }),
};