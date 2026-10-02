export const ROLES = ["admin", "staff", "customer"];

export const ROLE_INFO = {
  admin: { label: "Admin", desc: "Full access to everything. Cannot be restricted." },
  staff: { label: "Staff", desc: "Cafe team. Sees only the menus you allow below." },
  customer: { label: "Customer", desc: "Regular website user. No dashboard access." },
};

// One permission per dashboard menu. adminOnly = can never be given to staff.
export const PERMISSIONS = [
  { key: "dashboard", label: "Dashboard", desc: "Sales overview and stats", path: "/dashboard" },
  { key: "pos", label: "POS", desc: "Take and charge orders at the counter", path: "/dashboard/pos" },
  { key: "orders", label: "Orders", desc: "View orders and change their status", path: "/dashboard/orders" },
  { key: "menu", label: "Menu Manager", desc: "Add, edit and hide menu items", path: "/dashboard/menu" },
  { key: "reports", label: "Reports", desc: "Sales reports and CSV export", path: "/dashboard/reports" },
  { key: "pages", label: "Pages & Hero", desc: "Edit website content", path: "/dashboard/pages" },
  { key: "users", label: "Users", desc: "Manage customers (admins manage everyone)", path: "/dashboard/users" },
  { key: "roles", label: "Roles & Permissions", desc: "Change who can open what", path: "/dashboard/roles-permissions", adminOnly: true },
];

export const ALL_KEYS = PERMISSIONS.map((p) => p.key);

export const DEFAULT_ACCESS = {
  staff: ["dashboard", "pos", "orders"],
};

export const fullName = (u) => `${u?.firstName || ""} ${u?.lastName || ""}`.trim();

// Resize and center-crop an uploaded photo into a small square (keeps localStorage small)
export const readAvatar = (file, size = 160) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const min = Math.min(img.width, img.height);
        canvas
          .getContext("2d")
          .drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });