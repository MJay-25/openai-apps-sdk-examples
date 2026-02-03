import { useEffect } from "react";
import { useOpenAiGlobal } from "../use-openai-global";
import { createRoot } from "react-dom/client";

interface UpdateOutput {
  resumePdf?: {
    file_id: string;
  };
  updateStruct?: any;
}

function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as UpdateOutput | null;
  const updateStruct = toolOutput?.updateStruct;
  console.log("Update Struct:", updateStruct);
  useEffect(() => {
    console.log("Resume Diagnose on update:", updateStruct);
  }, [updateStruct]);
  return (
    <div>
      <h1>Here is update</h1>
      <pre>{JSON.stringify(updateStruct, null, 2)}</pre>
    </div>
  );
}

const root = document.getElementById("update-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
