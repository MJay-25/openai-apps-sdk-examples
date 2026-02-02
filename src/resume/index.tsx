import { createRoot } from "react-dom/client";

function App() {
  

  return (
    <div>
      <h1>Resume Application</h1>
    </div>
  );
}

const root = document.getElementById("resume-root");

if (root) {
  createRoot(root).render(<App />);
}
