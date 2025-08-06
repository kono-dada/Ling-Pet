import { OpenAI } from 'openai';
import { ChatCompletionTool } from 'openai/resources';
import { FunctionParameters } from 'openai/resources';
import { ChatCompletionMessageParam } from 'openai/resources';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { fetch } from '@tauri-apps/plugin-http';
import { useAIConfigStore } from '../stores/aiConfig';

const ais = useAIConfigStore();

const openAIClient = new OpenAI({
  baseURL: ais.baseURL,
  apiKey: ais.apiKey,
  dangerouslyAllowBrowser: true,
  fetch: fetch, // 使用 Tauri 的 fetch，防止CORS问题
});

export class MCPClient {
  private mcp: Client;
  private openai: OpenAI;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: ChatCompletionTool[] = [];

  constructor() {
    this.openai = openAIClient;
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    this.connectToServer(new URL('http://127.0.0.1:8000/mcp/'))
  }

  async connectToServer(serverUrl: URL) {
    this.transport = new StreamableHTTPClientTransport(serverUrl, { fetch: fetch });
    await this.mcp.connect(this.transport);
    const toolsResult = await this.mcp.listTools();
    this.tools = toolsResult.tools.map((tool) => {
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema as FunctionParameters,
        }
      };
    });
    console.log(
      "Connected to server with tools:",
      this.tools.map(({ function: { name } }) => name)
    );
  }

  async processQuery(query: string) {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: query
      },
    ];

    while (true) {
      const response = await this.openai.chat.completions.create({
        model: ais.model,
        messages: messages,
        tools: this.tools,
      });
      const choice = response.choices[0];
      messages.push(choice.message);
      if (choice.finish_reason === 'stop') {
        return choice.message.content;
      } else if (choice.finish_reason === 'tool_calls') {
        const functionCall = choice.message.tool_calls!![0].function;
        console.log('Function call:', functionCall);
        const toolName = functionCall.name;
        const toolArgs = functionCall.arguments;

        // 调用对应的工具
        const toolResponse = await this.mcp.callTool({
          name: toolName,
          arguments: JSON.parse(toolArgs),
        });

        // 将工具响应添加到消息中
        messages.push({
          role: 'tool',
          content: toolResponse.content as string,
          tool_call_id: choice.message.tool_calls!![0].id,
        });
      }
    }
  }
  // methods will go here
}