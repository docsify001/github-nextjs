# 企业微信和OSS集成功能说明

## 企业微信消息推送功能

### 功能概述
在 `src/lib/shared/wework.ts` 中实现了企业微信消息推送功能，支持发送文本消息和图文消息。

### 主要功能
1. **文本消息发送**: 支持发送纯文本消息
2. **图文消息发送**: 自动将Slack附件转换为企业微信图文消息格式
3. **错误处理**: 完善的错误处理和调试日志

### 环境变量配置

#### 方式一：企业微信应用消息（推荐）
需要配置企业微信应用相关环境变量：
```bash
# 企业微信企业ID
WEWORK_CORPID=your_corp_id

# 企业微信应用Secret
WEWORK_CORPSECRET=your_app_secret

# 企业微信应用ID
WEWORK_AGENTID=your_agent_id

# 可选：指定接收者（用户ID、部门ID、标签ID）
WEWORK_TOUSER=user1|user2
WEWORK_TOPARTY=1|2
WEWORK_TOTAG=1|2
```

#### 方式二：企业微信webhook机器人（备用）
```bash
# 通用企业微信webhook（用于slack.ts中的集成）
WEWORK_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_WEBHOOK_KEY

# 每日通知专用企业微信webhook
WEWORK_DAILY_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_DAILY_WEBHOOK_KEY
```

### 使用方法
1. **集成到Slack**: 企业微信功能已集成到Slack消息发送中，当发送Slack消息时会自动同时发送到企业微信（如果配置了webhook URL）。
2. **每日通知任务**: 通过 `notifyDailyTask` 任务，将每日热门项目通知直接发送到企业微信，不再依赖Slack和Discord。
3. **智能选择发送方式**: 优先使用企业微信应用消息发送，如果未配置应用信息则降级使用webhook机器人发送。

## OSS存储功能

### 功能概述
在 `src/lib/oss/aliyun-oss.ts` 中扩展了OSS客户端，新增了JSON文件的存储和读取功能。

### 主要功能
1. **saveJSON**: 将JSON数据格式化后保存到OSS
2. **readJSON**: 从OSS读取JSON文件并解析
3. **自动降级**: 当OSS不可用时自动降级到本地文件系统

### 环境变量配置
需要配置以下阿里云OSS环境变量：
```bash
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OSS_BUCKET=your_bucket_name
ALIYUN_OSS_REGION=your_region
```

### 文件存储路径
JSON文件将存储在OSS的 `json-files/` 目录下，例如：
- `json-files/projects.json`
- `json-files/repos.json`

### 集成到Task Runner
在 `src/lib/tasks/task-runner.ts` 中，`saveJSON` 和 `readJSON` 方法已更新为优先使用OSS存储，失败时自动降级到本地文件系统。

## 使用示例

### 发送企业微信消息
```typescript
import { sendMessageToWeWork } from "@/lib/shared/wework";

// 方式一：使用企业微信应用消息（推荐）
await sendMessageToWeWork("Hello World", {
  agentid: parseInt(process.env.WEWORK_AGENTID!),
  touser: process.env.WEWORK_TOUSER,
  toparty: process.env.WEWORK_TOPARTY,
  totag: process.env.WEWORK_TOTAG,
});

// 方式二：使用webhook机器人
await sendMessageToWeWork("Hello World", {
  webhookUrl: process.env.WEWORK_WEBHOOK_URL!
});

// 发送图文消息
await sendMessageToWeWork("新项目推荐", {
  agentid: parseInt(process.env.WEWORK_AGENTID!),
  attachments: [
    {
      title: "项目名称",
      text: "项目描述",
      title_link: "https://github.com/user/repo",
      thumb_url: "https://example.com/avatar.jpg"
    }
  ]
});

// 运行每日通知任务
import { notifyDailyTask } from "@/lib/tasks/bestofjs/notify-daily.task";
// 需要配置 WEWORK_AGENTID 或 WEWORK_DAILY_WEBHOOK 环境变量
```

### 使用OSS存储JSON
```typescript
import { aliyunOSSClient } from "@/lib/oss/aliyun-oss";

// 保存JSON文件
const ossUrl = await aliyunOSSClient.saveJSON({ data: "example" }, "test.json");

// 读取JSON文件
const data = await aliyunOSSClient.readJSON("test.json");
```

## 注意事项

1. **企业微信应用配置**: 
   - 需要在企业微信管理后台创建应用并获取企业ID、应用Secret和应用ID
   - 参考[企业微信API文档](https://developer.work.weixin.qq.com/document/path/90236)
   - 应用需要配置接收消息的权限
2. **企业微信webhook**: 需要在企业微信管理后台创建机器人并获取webhook URL
3. **OSS权限**: 确保阿里云AccessKey具有OSS的读写权限
4. **网络环境**: 确保服务器能够访问企业微信API和阿里云OSS
5. **错误处理**: 企业微信发送失败不会影响Slack消息发送
6. **降级机制**: OSS不可用时自动使用本地文件系统，确保系统稳定性
7. **Access Token缓存**: 企业微信Access Token会自动缓存，避免频繁请求 