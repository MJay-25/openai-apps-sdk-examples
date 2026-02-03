import { useEffect } from "react";
import { useOpenAiGlobal } from "../use-openai-global";
import { createRoot } from "react-dom/client";

interface ResumeOutput {
  resumePdf?: {
    download_url: string;
    file_id: string;
    res: any;
  };
  resumeTopping: string;
}

function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as ResumeOutput | null;
  const resumeStruct = toolOutput?.resumePdf?.res;
  console.log("Resume Structure:", resumeStruct);
  useEffect(() => {
    console.log("Resume Structure on update:", resumeStruct);
  }, [resumeStruct]);

  return (
    <div>
      <h1>Here is analyze</h1>
      {/* <pre>{JSON.stringify(resumeStruct, null, 2)}</pre> */}
    </div>
  );
}

const root = document.getElementById("analyze-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
