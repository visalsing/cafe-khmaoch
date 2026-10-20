import { useEffect, useState } from "react";
import { userService, accessService } from "../services/api";

export function useUsers(showRemoved = false) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.list({ removed: showRemoved });
      setUsers(Array.isArray(data) ? data : []);
      setError("");
      return true;
    } catch (err) {
      setError(err.message || "Could not load the users.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [showRemoved]);

  useEffect(() => {
    reload();
  }, [reload]);

  // every action runs, then the list is loaded again, so the table always matches the database
  const run = (fn) => async (...args) => {
    const result = await fn(...args);
    await reload();
    return result;
  };

  return {
    users,
    loading,
    error,
    reload,
    addUser: run((formData) => userService.create(formData)),
    updateUser: run((id, formData) => userService.update(id, formData)),
    setBlocked: run((id, blocked) => userService.setBlocked(id, blocked)),
    removeUser: run((id) => userService.remove(id)),     // soft remove
    restoreUser: run((id) => userService.restore(id)),
    deleteUser: run((id) => userService.delete(id)),     // permanent
  };
}

export function useAccessMatrix() {
  const [matrix, setMatrix] = useState({ admin: [], staff: [], customer: [] });

  useEffect(() => {
    accessService.get().then(setMatrix).catch((e) => alert(e.message));
  }, []);

  const setRolePermission = async (role, key, enabled) => {
    if (role !== "staff") return;
    const staff = enabled ? [...new Set([...matrix.staff, key])] : matrix.staff.filter((k) => k !== key);
    setMatrix((m) => ({ ...m, staff })); // instant UI
    try {
      setMatrix(await accessService.saveStaff(staff));
    } catch (e) {
      alert(e.message);
      accessService.get().then(setMatrix);
    }
  };
  const resetStaff = async () => setMatrix(await accessService.reset());

  return { matrix, setRolePermission, resetStaff };
}