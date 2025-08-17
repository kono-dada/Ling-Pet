export interface Tool {
  name: string;
  description?: string;
  // 工具的参数分开传入（非单一 args 占位）
  call: (...args: string[]) => Promise<unknown>;
}
