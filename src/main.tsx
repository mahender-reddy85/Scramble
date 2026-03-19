import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const skipLink = document.createElement('a');
skipLink.href = '#main-content';
skipLink.className = 'skip-link';
skipLink.textContent = 'Skip to main content';
document.body.insertBefore(skipLink, document.body.firstChild);

createRoot(document.getElementById("root")!).render(<App />);
