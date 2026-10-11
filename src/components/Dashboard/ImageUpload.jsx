import React, { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { assetUrl } from "../../services/api";

const MAX = 5 * 1024 * 1024; // 5 MB, same limit as the server

// Tip: give it a `key` (the item id, or "new") so it resets when you open another item.
export default function ImageUpload({ label = "Image", currentUrl = "", onChange }) {
  const [preview, setPreview] = useState(assetUrl(currentUrl));

  // free the temporary browser URL when the preview changes or the form closes
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets you pick the same file again later
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return alert("Please choose a JPG, PNG, WebP or GIF image.");
    if (file.size > MAX) return alert("The image is larger than 5 MB.");
    setPreview(URL.createObjectURL(file));
    onChange({ file, remove: false });
  };

  const clear = () => {
    setPreview("");
    onChange({ file: null, remove: true });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      <div className="flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="" className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
        ) : (
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
            <Upload className="w-6 h-6" />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer hover:border-amber-500">
            <Upload className="w-4 h-4" /> {preview ? "Change image" : "Upload image"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pick} className="hidden" />
          </label>
          {preview && (
            <button type="button" onClick={clear} className="block text-xs text-rose-500">Remove image</button>
          )}
          <p className="text-[11px] text-slate-400">JPG, PNG, WebP or GIF, up to 5 MB. The thumbnail is created automatically.</p>
        </div>
      </div>
    </div>
  );
}