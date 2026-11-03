import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { RICH_CLASS } from "./richStyle";

const ALIGN = /^\s*text-align:\s*(left|right|center|justify)\s*;?\s*$/i;

// the server already cleaned the text; this second filter protects the page even if the database is edited by hand
const purify = typeof window !== "undefined" ? DOMPurify(window) : DOMPurify; // our own copy: no hooks leak to other code
purify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style" && !ALIGN.test(data.attrValue)) data.keepAttr = false;
});
purify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const OPTIONS = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "hr"],
  ALLOWED_ATTR: ["href", "target", "rel", "style"],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
};

export default function RichText({ html, className = "" }) {
  const safe = useMemo(() => (html ? purify.sanitize(String(html), OPTIONS) : ""), [html]);
  if (!safe) return null;
  return <div className={`${RICH_CLASS} ${className}`} dangerouslySetInnerHTML={{ __html: safe }} />;
}