
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div>
      <h1>Here is diagnose</h1>
    </div>
  );
}

const root = document.getElementById("diagnose-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
