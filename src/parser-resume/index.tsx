
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div>
      <h1>Here is parser resume</h1>
    </div>
  );
}

const root = document.getElementById("parser-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
