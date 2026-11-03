import DOMPurify from "isomorphic-dompurify";

// exactly what the editor can produce. Everything else is removed.
const TAGS = ["p", "br", "strong", "em", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "hr"];
const ATTRS = ["href", "target", "rel", "style"];
const ALIGN = /^\s*text-align:\s*(left|right|center|justify)\s*;?\s*$/i; // the only style allowed
const URI = /^(?:https?:|mailto:|tel:|\/|#)/i;

export const MAX_HTML = 12000; // characters of formatted text per language

export function cleanHtml(input) {
  const html = String(input ?? "").slice(0, 60000);
  if (!html.trim()) return "";

  const keepAlignOnly = (_node, data) => {
    if (data.attrName === "style" && !ALIGN.test(data.attrValue)) data.keepAttr = false;
  };
  const safeLinks = (node) => {
    if (node.tagName === "A" && node.getAttribute("target")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  };

  // the hooks live only for this one synchronous call, so the country-flag SVG cleaner is not affected
  DOMPurify.addHook("uponSanitizeAttribute", keepAlignOnly);
  DOMPurify.addHook("afterSanitizeAttributes", safeLinks);
  try {
    const out = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: TAGS,
      ALLOWED_ATTR: ATTRS,
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: URI,
    });
    const text = out.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    return text || /<hr/i.test(out) ? out.trim() : ""; // an empty editor ("<p></p>") counts as empty
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute");
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}