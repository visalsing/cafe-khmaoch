import { useEffect, useState } from "react";
import { userService, accessService } from "../services/api";

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.list().then(setUsers).catch((e) => alert(e.message)).finally(() => setLoading(false));
  }, []);

  const addUser = async (data) => {
    const u = await userService.create(data);
    setUsers((p) => [u, ...p]);
    return u;
  };
  const updateUser = async (id, changes) => {
    const u = await userService.update(id, changes);
    setUsers((p) => p.map((x) => (x.id === id ? u : x)));
    return u;
  };
  const removeUser = async (id) => {
    await userService.remove(id);
    setUsers((p) => p.filter((x) => x.id !== id));
  };

  return { users, loading, addUser, updateUser, removeUser };
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