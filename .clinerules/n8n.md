---
description: "用于生成 n8n 节点模板和文件结构的规则。"
globs: ["**/nodes/**/*.node.ts", "**/*.node.ts"] # 当上下文中存在 .node.ts 文件时自动关联
alwaysApply: false # 对于 n8n 项目，可设置为 true 以始终激活
---
# n8n 自定义节点开发规范

## 文件结构
- **主逻辑文件**: 创建新 n8n 节点（如 `MyExample`）时，主逻辑文件应存放于 `nodes/MyExample/MyExample.node.ts`。
- **元数据**: 节点元数据应定义在 `MyExample.node.json` 文件中。
- **凭证**: 如需身份验证，请在 `credentials/MyExampleApi.credentials.ts` 中添加凭证文件。

## 参考资料
- 使用 `context7` MCP 工具引入 n8n 官方文档作为开发参考。

## 语言要求
- 在所有交流、代码注释和功能描述中，请统一使用中文。
