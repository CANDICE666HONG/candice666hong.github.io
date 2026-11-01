import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./portfolio.css";

const language = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh';

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <a className="portfolio-return" href={`/?lang=${language}#desktop-tides`}>
      <span aria-hidden="true">←</span>{language === 'en' ? 'Back to portfolio' : '返回作品集'}
    </a>
    <App />
  </React.StrictMode>,
);
