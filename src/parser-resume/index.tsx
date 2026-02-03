import { useEffect, useState } from "react";
import { useOpenAiGlobal } from "../use-openai-global";
import { createRoot } from "react-dom/client";

interface ResumeOutput {
  resumePdf?: {
    download_url: string;
    file_id: string;
  };
  resumeTopping: string;
  verify: any; // 或者根据需要细化
}

function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as ResumeOutput | null;
  // let downloadUrl = toolOutput?.resumePdf?.download_url;
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    // downloadUrl = toolOutput?.resumePdf?.download_url;
    setDownloadUrl(toolOutput?.resumePdf?.download_url);
    console.log("toolOutput in parser-resume:", toolOutput);
    console.log("Download URL:", downloadUrl);
  }, [toolOutput]);

  return (
    <div>
      <h1>Here is parser resume</h1>
      <iframe 
        src={downloadUrl} 
        width="100%"
        height="600px"
        title="Resume PDF Viewer"
      />
    </div>
  );
}

const root = document.getElementById("parser-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
