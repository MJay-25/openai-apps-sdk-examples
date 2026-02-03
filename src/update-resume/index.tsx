
import { useEffect } from "react";
import { createRoot } from "react-dom/client";

function App() {
  useEffect(() => {
    // 这里可以添加一些初始化逻辑
    console.log("Update Resume component mounted");
  }, []);
  return (
    <div>
      <h1>Here is update</h1>
    </div>
  );
}

const root = document.getElementById("update-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
