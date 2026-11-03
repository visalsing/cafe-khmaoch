// Tailwind's reset removes list bullets and heading sizes, so they are put back here.
// The editor and the About page use the SAME classes: what you see while editing is what visitors get.
export const RICH_CLASS = [
  "text-stone-600 dark:text-stone-300 leading-relaxed break-words",
  "[&_p]:mb-3 [&_p:last-child]:mb-0",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-stone-900 dark:[&_h2]:text-white",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-stone-900 dark:[&_h3]:text-white",
  "[&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-stone-900 dark:[&_h4]:text-white",
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-accent-500 [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_a]:text-accent-600 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-accent-700",
  "[&_hr]:my-6 [&_hr]:border-stone-200 dark:[&_hr]:border-stone-700",
  "[&_strong]:font-bold [&_strong]:text-stone-900 dark:[&_strong]:text-white",
].join(" ");