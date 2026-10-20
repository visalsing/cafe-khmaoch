import React, { useEffect, useState } from "react";
import { FileImage } from "lucide-react";
import { assetUrl } from "../../services/api";

const MAX = 512 * 1024; // same limit as the server

export default function SvgUpload({ label = "SVG", currentUrl = "", onChange }) {
  const [preview, setPreview] = useState(assetUrl(currentUrl));
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  // Sync preview when currentUrl changes (e.g. switching between different items to edit)
  useEffect(() => {
    setPreview(assetUrl(currentUrl));
    setFileName("");
    setError("");
  }, [currentUrl]);

  // free the temporary browser URL when the preview changes or the form closes
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets you pick the same file again later
    if (!file) return;
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (!isSvg) return setError("Please choose an .svg file.");
    if (file.size > MAX) return setError("The SVG is larger than 512 KB.");
    setError("");
    setPreview(URL.createObjectURL(file)); // an <img> never runs scripts inside an SVG
    setFileName(file.name);
    onChange({ file, remove: false });
  };

  const clear = () => {
    setPreview("");
    setFileName("");
    setError("");
    onChange({ file: null, remove: Boolean(currentUrl) }); // only "remove" if there was a saved SVG
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
      <div className="flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="" className="w-24 h-24 rounded-xl object-contain bg-slate-100 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700" />
        ) : (
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
            <FileImage className="w-6 h-6" />
          </div>
        )}
        <div className="space-y-1.5 min-w-0">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer hover:border-amber-500">
            <FileImage className="w-4 h-4" /> {preview ? "Change SVG" : "Upload SVG"}
            <input type="file" accept=".svg,image/svg+xml" onChange={pick} className="hidden" />
          </label>
          {preview && (
            <button type="button" onClick={clear} className="block text-xs text-rose-500">Remove SVG</button>
          )}
          {fileName && <p className="text-xs text-slate-500 truncate">{fileName}</p>}
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <p className="text-[11px] text-slate-400">SVG only, up to 512 KB. Scripts inside the file are removed automatically.</p>
        </div>
      </div>
    </div>
  );
}