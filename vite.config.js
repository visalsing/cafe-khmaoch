import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// export default defineConfig({
//   plugins: [
//     react(),
//     tailwindcss()
//   ],
// })


export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ["react", "react-dom"] },
});

// export default defineConfig({
//   plugins: [react()],
//   resolve: { dedupe: ["react", "react-dom"] },
//   optimizeDeps: {
//     include: [
//       "react",
//       "react-dom",
//       "react-dom/client",
//       "react-router-dom",
//       "lucide-react",
//       "recharts",
//       "react-redux",
//       "@reduxjs/toolkit",
//       "react-helmet-async",
//     ],
//   },
// });
