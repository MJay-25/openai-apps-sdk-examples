
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div>
      <h1>Here is analyze</h1>
    </div>
  );
}

const root = document.getElementById("analyze-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
