import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type ResumeWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");
const FILE_TOOL_WIDGET = ["show-parser-resume", "show-analyze-resume"]; 

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

function widgetDescriptorMeta(widget: ResumeWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    // "openai/widgetCSP": {
      // "connect_domains": [
      //   "https://oaisdmntprcentralus.blob.core.windows.net",
      //   "https://localhost:4444",
      //   "http://localhost:4444"
      // ],
      // "resource_domains": [
      //   "https://oaisdmntprcentralus.blob.core.windows.net",
      //   "https://localhost:4444",
      //   "http://localhost:4444"
      // ],
      // "frame_domains": [
        // "https://oaisdmntprcentralus.blob.core.windows.net",
        // "https://localhost:4444",
        // "http://localhost:4444"
      // ]
    // }
  } as const;
}

function widgetInvocationMeta(widget: ResumeWidget) {
  return {
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
  } as const;
}

const widgets: ResumeWidget[] = [
  {
    id: "show-parser-resume",
    title: "Show Parser Resume",
    templateUri: "ui://widget/parser-resume.html",
    invoking: "Start Parser Resume",
    invoked: "finished Parsing Resume",
    html: readWidgetHtml("parser-resume"),  // 这个别忘了修改，这个是链接到打包好的html文件
    responseText: "Rendered Parser Resume!",
  },
  {
    id: "show-diagnose-resume",
    title: "Show Diagnose Resume",
    templateUri: "ui://widget/diagnose-resume.html",
    invoking: "Start Diagnose Resume",
    invoked: "finished Diagnose Resume",
    html: readWidgetHtml("diagnose-resume"),  // 这个别忘了修改，这个是链接到打包好的html文件
    responseText: "Rendered Diagnose Resume!",
  },
  {
    id: "show-analyze-resume",
    title: "Show Analyze Resume",
    templateUri: "ui://widget/analyze-resume.html",
    invoking: "Start Analyze Resume",
    invoked: "finished Analyze Resume",
    html: readWidgetHtml("analyze-resume"),  // 这个别忘了修改，这个是链接到打包好的html文件
    responseText: "Rendered Analyze Resume!",
  },
  {
    id: "show-update-resume",
    title: "Show Update Resume",
    templateUri: "ui://widget/update-resume.html",
    invoking: "Start update Resume",
    invoked: "finished updating Resume",
    html: readWidgetHtml("update-resume"),  // 这个别忘了修改，这个是链接到打包好的html文件
    responseText: "Rendered Update Resume!",
  },
];

const widgetsById = new Map<string, ResumeWidget>();
const widgetsByUri = new Map<string, ResumeWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

const toolInputSchema = {
  type: "object",
  properties: {
    resumeTopping: {
      type: "string",
      description: "Topping to mention when rendering the widget.",
    },
  },
  required: ["resumeTopping"],
  additionalProperties: false,
} as const;

const toolInputParser = z.object({
  resumeTopping: z.string(),
});

const fileParamParser = z.object({
  download_url: z.string().url(),
  file_id: z.string(),
});

const parserToolInputSchema = {
  type: "object",
  properties: {
    resumeTopping: {
      type: "string",
      description: "Topping to mention when rendering the widget.",
    },
    resumePdf: {
      description: "Uploaded resume PDF",
    },
  },
  required: ["resumeTopping", "resumePdf"],
  additionalProperties: false,
} as const;

const parserToolInputParser = z.object({
  resumeTopping: z.string(),
  resumePdf: fileParamParser,
});


// const tools: Tool[] = widgets.map((widget) => ({
//   name: widget.id,
//   description: widget.title,
//   inputSchema: toolInputSchema,
//   title: widget.title,
//   _meta: widgetDescriptorMeta(widget),
//   // To disable the approval prompt for the widgets
//   annotations: {
//     destructiveHint: false,
//     openWorldHint: false,
//     readOnlyHint: true,
//   },
// }));

const tools: Tool[] = widgets.map((widget) => {
  const isParser = FILE_TOOL_WIDGET.includes(widget.id);
  console.log(`[server] Configuring tool "${widget.id}" as file tool: ${isParser}`);

  return {
    name: widget.id,
    description: widget.title,
    title: widget.title,

    inputSchema: isParser ? parserToolInputSchema : toolInputSchema,

    _meta: {
      ...widgetDescriptorMeta(widget),
      ...(isParser ? { "openai/fileParams": ["resumePdf"] } : {}),
    },

    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  };
});


const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetDescriptorMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetDescriptorMeta(widget),
}));

function createResumeServer(): Server {
  const server = new Server(
    {
      name: "resume-node",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources,
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetDescriptorMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const widget = widgetsById.get(request.params.name);

      if (!widget) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }
      if (widget.id === "show-analyze-resume") {
        const args = parserToolInputParser.parse(request.params.arguments ?? {});
        const { download_url, file_id } = args.resumePdf;
        console.log("Calling parser-resume tool with args:", request.params);
        console.log(`Received resume PDF - download_url: ${download_url}, file_id: ${file_id}`);
        const url = "https://swan-api.jobright-internal.com/swan/resume/visitor/analyze";
        const data = {
          url: download_url,
        };
        let res: any = null;
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            throw new Error('网络请求错误: ' + response.status);
          }

          res = await response.json(); // 直接在这里获取 JSON 数据
          console.log('分析结果:', res);
          
          // 现在你可以在这里或者函数外部安全地使用 res 了
        } catch (error) {
          console.error('调用失败:', error);
        }

        return {
          content: [
            {
              type: "text",
              text:
                `✅ Got file reference!\n` +
                `file_id: ${file_id}\n` +
                `download_url: ${download_url ? "present" : "missing"}\n`
            },
          ],
          structuredContent: {
            resumeTopping: args.resumeTopping,
            resumePdf: { file_id, download_url, res }, // 也回显一下，方便你在前端/日志里确认
            // resumeStruct: res
          },
          _meta: widgetInvocationMeta(widget),
        };
      }
      if (widget.id === "show-diagnose-resume") {
        console.log("Calling diagnose-resume tool with args:", request.params);
      }
      if (widget.id === "show-update-resume") {
        console.log("Calling update-resume tool with args:", request.params);
      }
      if (widget.id === "show-parser-resume") {
        const args = parserToolInputParser.parse(request.params.arguments ?? {});
        const { download_url, file_id } = args.resumePdf;
        console.log("Calling parser-resume tool with args:", request.params);
        console.log(`Received resume PDF - download_url: ${download_url}, file_id: ${file_id}`);
         // ✅ 验证：不下载文件，只做“最小网络探测”
        let verify: any = {
          file_id,
          has_download_url: Boolean(download_url),
        };

        // 1) 先尝试 HEAD（通常不会拉取 body）
        try {
          const headRes = await fetch(download_url, { method: "HEAD" });
          verify.head = {
            ok: headRes.ok,
            status: headRes.status,
            content_type: headRes.headers.get("content-type"),
            content_length: headRes.headers.get("content-length"),
            content_disposition: headRes.headers.get("content-disposition"),
          };
        } catch (e: any) {
          verify.head = { error: String(e?.message ?? e) };
        }

        // 2) 有些服务不支持 HEAD：再用 Range 拉 1 个字节（仍然不算“下载 PDF”）
        //    你也可以只保留其中一个校验方式。
        try {
          const rangeRes = await fetch(download_url, {
            method: "GET",
            headers: { Range: "bytes=0-0" },
          });
          verify.range = {
            ok: rangeRes.ok,
            status: rangeRes.status,
            content_type: rangeRes.headers.get("content-type"),
            content_range: rangeRes.headers.get("content-range"),
            accept_ranges: rangeRes.headers.get("accept-ranges"),
          };
          // 读 1 个字节只是为了确保链接确实能返回内容
          const ab = await rangeRes.arrayBuffer();
          verify.range.bytes_read = ab.byteLength; // 通常是 1
        } catch (e: any) {
          verify.range = { error: String(e?.message ?? e) };
        }

        console.log("[show-parser-resume] file verify:", verify);

        return {
          content: [
            {
              type: "text",
              text:
                `✅ Got file reference!\n` +
                `file_id: ${file_id}\n` +
                `download_url: ${download_url ? "present" : "missing"}\n` +
                `HEAD status: ${verify.head?.status ?? "n/a"} | Range status: ${verify.range?.status ?? "n/a"}`,
            },
          ],
          structuredContent: {
            resumeTopping: args.resumeTopping,
            resumePdf: { file_id, download_url }, // 也回显一下，方便你在前端/日志里确认
            verify,
          },
          _meta: widgetInvocationMeta(widget),
        };
      }

      const args = toolInputParser.parse(request.params.arguments ?? {});

      return {
        content: [
          {
            type: "text",
            text: widget.responseText,
          },
        ],
        structuredContent: {
          resumeTopping: args.resumeTopping,
        },
        _meta: widgetInvocationMeta(widget),
      };
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  console.info("[mcp] SSE connect request", res);
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createResumeServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  console.info(`[mcp] SSE session created: ${sessionId}`);

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    console.log(`[mcp] SSE session closed: ${sessionId}`);
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
    console.log(`[mcp] SSE session connected: ${sessionId}`);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  console.info(`[mcp] POST message: ${url.toString()}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    console.warn("[mcp] Missing sessionId in POST message");
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    console.warn(`[mcp] Unknown sessionId: ${sessionId}`);
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
    console.log(`[mcp] POST message handled for session: ${sessionId}`);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    console.log(`[mcp] Incoming request: ${req.method} ${req.url}`);
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Resume MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
