import { useState } from "react";
import { useOpenAiGlobal } from "../use-openai-global";
import { createRoot } from "react-dom/client";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";

interface ResumeOutput {
  resumePdf?: {
    download_url: string;
    file_id: string;
  };
  resumeTopping: string;
  verify: any; // 或者根据需要细化
}

// 引入样式（必须引入，否则文本层会错位）
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as ResumeOutput | null;
  
  // 状态管理
  const [numPages, setNumPages] = useState<number | null>(null); // 总页数
  const [pageNumber, setPageNumber] = useState<number>(1);       // 当前页码

  const downloadUrl = toolOutput?.resumePdf?.download_url;

  // 文档加载成功的回调
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1); // 加载新文档时重置为第1页
  }

  // 翻页逻辑
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1>Resume Parser</h1>

      {downloadUrl ? (
        <>
          {/* 翻页控制栏 */}
          <div style={{ marginBottom: '10px' }}>
            <button onClick={goToPrevPage} disabled={pageNumber <= 1}>
              上一页
            </button>
            <span style={{ margin: '0 15px' }}>
              第 {pageNumber} 页 / 共 {numPages || "?"} 页
            </span>
            <button onClick={goToNextPage} disabled={pageNumber >= (numPages || 1)}>
              下一页
            </button>
          </div>

          {/* PDF 渲染区域 */}
          <div style={{ border: '1px solid #ddd', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Document 
              file={downloadUrl} 
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={console.error}
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={true} 
                renderAnnotationLayer={true}
                width={600} // 可以固定宽度提高渲染稳定性
              />
            </Document>
          </div>
        </>
      ) : (
        <p>Loading resume or no file available...</p>
      )}
    </div>
  );
}

const root = document.getElementById("parser-resume-root");

if (root) {
  createRoot(root).render(<App />);
}
