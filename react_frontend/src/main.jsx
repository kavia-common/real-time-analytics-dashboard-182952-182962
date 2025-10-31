import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import AppRouter from "./router.jsx";

// Bootstrap the React application to #root
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<AppRouter />);
