import { useEffect } from "react";
import { useOpenAiGlobal } from "../use-openai-global";
import { createRoot } from "react-dom/client";

interface DiagnoseOutput {
  resumePdf?: {
    file_id: string;
  };
  analysis?: string;
}

function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as DiagnoseOutput | null;
  const resumeDiagnose = toolOutput?.analysis;
  console.log("Resume Diagnose:", resumeDiagnose);
  useEffect(() => {
    console.log("Resume Diagnose on update:", resumeDiagnose);
  }, [resumeDiagnose]);

  return (
    <div>
      <h1>Here is diagnose</h1>
      <pre>{ resumeDiagnose }</pre>
    </div>
  );
}

const root = document.getElementById("diagnose-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
