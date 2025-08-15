# 事件系统（Event System）

此目录包含构建在 Tauri v2 事件之上的全局、强类型事件系统，目标是让事件的“产生者”和“监听者”更易查找、更解耦、更可维护。

## 设计目标

- 监听统一管理：用一个全局管理器集中注册/注销所有监听器。
- 发送集中出口：通过领域 Emitters 发送事件，组件不直接发事件。
- 全量强类型：所有事件名与负载在一个注册表中声明并校验。
- 支持阻塞：可选“阻塞”监听，避免异步处理重叠。
- 可插拔：以插件化方式扩展功能与处理器。

## 关键文件

- `appEvents.ts`
  - 定义事件注册表 `EventPayloadMap`（事件名 -> 负载类型）。
  - 封装 `emitEvent(event, payload)` 与 `listenEvent(event, handler, { blocking })`（基于 Tauri 的 `emit`/`listen`）。
  - 阻塞模式为“进程内”：同事件的上一次处理未完成时，新事件会被丢弃。

- `emitters.ts`
  - 全局集中、按领域分类的事件发送函数。请使用这些函数，而不要在其他地方直接调用 `emitEvent`。
  - 例如：`emitWindowsUpdated`、`emitNewWindows`、`emitAvatarMultiClick`。

- `handlerManager.ts`
  - 通用监听管理器，接收若干 `HandlerDescriptor`，负责按需挂载/卸载监听。
  - 监听 `isEnabled()` 的响应式变化，动态启停对应处理器。
  - 打印处理器生命周期日志：启动/停止/失败。

- `globalHandlers.ts`
  - 汇总各插件提供的处理器描述，并交给管理器统一管理。

## 插件（Plugins）

- 每个插件暴露一个返回 `HandlerDescriptor[]` 的方法：`src/plugins/<feature>/index.ts`。
  - 屏幕分析示例：`src/plugins/screenAnalysis/index.ts`（监听 `NEW_WINDOWS`）。
  - 交互示例：`src/plugins/interactions/index.ts`（监听 `AVATAR_MULTI_CLICK`）。

## 约定与规则

- 组件不直接调用 `emitEvent`，应调用集中定义的 `emitters.ts` 中的发送函数，或领域内的 emitters。
- 只在全局管理器（`globalHandlers.ts`）里注册监听；具体处理函数保持纯函数、无副作用注册。
- 所有事件与负载类型必须在 `EventPayloadMap` 中声明一次。

## 如何新增一个事件

1) 在 `appEvents.ts` 的 `EventPayloadMap` 中新增条目：
   - `MY_EVENT: { foo: string; bar: number }`

2) 在 `emitters.ts` 中新增一个发送函数：
   - `export function emitMyEvent(payload: EventPayloadMap['MY_EVENT']) { return emitEvent('MY_EVENT', payload); }`

3) 在你的功能/插件目录中实现处理器（纯函数）：
   - 例：`src/plugins/myFeature/handlers.ts` → `export async function handleMyEvent(payload) { ... }`

4) 在插件文件中注册处理器，返回 `HandlerDescriptor[]`：
   - `{ key: 'myFeature:my-event', event: 'MY_EVENT', blocking: true|false, isEnabled: () => store.flag, handle: handleMyEvent }`

5) 在 `globalHandlers.ts` 汇总你的插件（import 并展开到数组中）。

## 阻塞语义（blocking）

- `listenEvent(..., { blocking: true })`：对某个事件类型，若处理器正在运行，则新到事件会被丢弃，直到处理结束。
- 阻塞是“渲染进程级”的。如果需要跨窗口全局互斥，请将该处理放到后端或指定单一前端窗口来承载。

## 跨窗口 / 前后端

- 使用 Tauri v2 的 `emit`/`listen`，事件可在多窗口之间传递，亦可在前后端之间传递。

## 仓库内示例

- 事件发送方（Emitters）：
  - 屏幕维护器：`emitWindowsUpdated`、`emitNewWindows`。
  - 头像多击检测：`emitAvatarMultiClick`。

- 事件处理方（Handlers）：
  - 屏幕分析：`handleNewWindows`（阻塞，描述屏幕并流式回复）。
  - 交互：`handleAvatarMultiClick`（阻塞，直接注入两条消息）。

## 生命周期接入

- `src/pages/MainPage.vue` 中，通过 `createGlobalHandlersManager()` 启动/停止全局管理器。
- 设置开关通过 `HandlerDescriptor.isEnabled` 响应式控制启停。
 