import { http } from "./http.js";

export const rolePermissionsService = {
  // GET /api/role_permissions
  list: () => http("/role_permissions"),

  // GET /api/role_permissions/:roleId
  listByRole: (roleId) => http(`/role_permissions/${roleId}`),

  // POST /api/role_permissions
  create: (data) =>
    http("/role_permissions", {
      method: "POST",
      body: data,
    }),

  // PUT /api/role_permissions/:id
  update: (id, data) =>
    http(`/role_permissions/${id}`, {
      method: "PUT",
      body: data,
    }),

  // DELETE /api/role_permissions/:id
  remove: (id) =>
    http(`/role_permissions/${id}`, {
      method: "DELETE",
    }),
};
