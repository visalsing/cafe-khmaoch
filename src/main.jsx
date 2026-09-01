// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import App from './App.jsx'
// import { ThemeProvider } from './context/ThemeContext.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <ThemeProvider>
//       <App />
//     </ThemeProvider>
//   </StrictMode>,
// )

// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import App from './App.jsx'
// import { ThemeProvider } from './context/ThemeContext.jsx'
// import { LanguageProvider } from './context/LanguageContext.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <ThemeProvider>
//       <LanguageProvider>
//         <App />
//       </LanguageProvider>
//     </ThemeProvider>
//   </StrictMode>,
// )

// // main.jsx
// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
// import { BrowserRouter } from "react-router-dom"; // 1. Import HashRouter
// import App from "./App.jsx";
// import { ThemeProvider } from "./context/ThemeContext.jsx";
// import { LanguageProvider } from "./context/LanguageContext.jsx";

// createRoot(document.getElementById("root")).render(
//   <StrictMode>
//     <ThemeProvider>
//       <LanguageProvider>
//         {/* 2. Wrap App with HashRouter */}
//         {/* <HashRouter>
//           <App />
//         </HashRouter> */}
//         <BrowserRouter>
//           <App />
//         </BrowserRouter>
//       </LanguageProvider>
//     </ThemeProvider>
//   </StrictMode>,
// );


// import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
);