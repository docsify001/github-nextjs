import debugPackage from "debug";
import { ProjectItem } from "@/lib/tasks/bestofjs/static-api-types";

const debug = debugPackage("wework");

type Project = Pick<
  ProjectItem,
  "name" | "full_name" | "owner_id" | "description" | "url"
>;

// 企业微信应用消息接口
interface WeWorkAppMessage {
  touser?: string;
  toparty?: string;
  totag?: string;
  msgtype: "text" | "markdown" | "news";
  agentid: number;
  text?: {
    content: string;
  };
  markdown?: {
    content: string;
  };
  news?: {
    articles: Array<{
      title: string;
      description: string;
      url: string;
      picurl?: string;
    }>;
  };
}

// 企业微信webhook消息接口（机器人）
interface WeWorkWebhookMessage {
  msgtype: "text" | "markdown" | "news";
  text?: {
    content: string;
  };
  markdown?: {
    content: string;
  };
  news?: {
    articles: Array<{
      title: string;
      description: string;
      url: string;
      picurl?: string;
    }>;
  };
}

// Access Token缓存
let accessTokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * 获取企业微信Access Token
 */
async function getWeWorkAccessToken(): Promise<string> {
  const corpid = process.env.WEWORK_CORPID;
  const corpsecret = process.env.WEWORK_CORPSECRET;
  
  if (!corpid || !corpsecret) {
    throw new Error('企业微信配置缺失: WEWORK_CORPID 或 WEWORK_CORPSECRET');
  }

  // 检查缓存是否有效
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  try {
    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${corpsecret}`
    );
    
    if (!response.ok) {
      throw new Error(`获取Access Token失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errcode !== 0) {
      throw new Error(`企业微信API错误: ${data.errmsg}`);
    }

    // 缓存token，提前5分钟过期
    accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    return data.access_token;
  } catch (error) {
    throw new Error(`获取企业微信Access Token失败: ${(error as Error).message}`);
  }
}

/**
 * 发送企业微信应用消息
 */
export async function sendMessageToWeWork(
  text: string,
  {
    webhookUrl,
    attachments,
    touser,
    toparty,
    totag,
    agentid,
  }: { 
    webhookUrl?: string; 
    attachments?: any[];
    touser?: string;
    toparty?: string;
    totag?: string;
    agentid?: number;
  }
) {
  // 优先使用应用消息发送
  if (agentid) {
    return await sendAppMessage(text, { attachments, touser, toparty, totag, agentid });
  }
  
  // 降级使用webhook发送
  if (webhookUrl) {
    return await sendWebhookMessage(text, { webhookUrl, attachments });
  }

  throw new Error('企业微信消息发送失败: 未配置agentid或webhookUrl');
}

/**
 * 发送企业微信应用消息
 */
async function sendAppMessage(
  text: string,
  {
    attachments,
    touser,
    toparty,
    totag,
    agentid,
  }: {
    attachments?: any[];
    touser?: string;
    toparty?: string;
    totag?: string;
    agentid: number;
  }
) {
  const accessToken = await getWeWorkAccessToken();
  
  const message: WeWorkAppMessage = {
    msgtype: "text",
    agentid,
    text: {
      content: text,
    },
  };

  // 设置接收者
  if (touser) message.touser = touser;
  if (toparty) message.toparty = toparty;
  if (totag) message.totag = totag;

  // 如果有附件且包含项目信息，转换为图文消息
  if (attachments && attachments.length > 0) {
    const articles = attachments
      .filter((attachment: any) => attachment.title && attachment.title_link)
      .map((attachment: any) => ({
        title: attachment.title,
        description: attachment.text || attachment.pretext || "",
        url: attachment.title_link,
        picurl: attachment.thumb_url,
      }));

    if (articles.length > 0) {
      message.msgtype = "news";
      message.news = { articles };
      delete message.text;
    }
  }

  debug("App Message Request", message);
  
  try {
    const result = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
      {
        method: "POST",
        body: JSON.stringify(message),
        headers: { "content-type": "application/json" },
      }
    );

    if (!result.ok) {
      throw new Error(`企业微信应用消息API响应错误: ${result.status} ${result.statusText}`);
    }

    const responseText = await result.text();
    debug("App Message Response", responseText);
    
    const response = JSON.parse(responseText);
    if (response.errcode !== 0) {
      throw new Error(`企业微信应用消息API错误: ${response.errmsg}`);
    }

    return true;
  } catch (error) {
    throw new Error(`企业微信应用消息发送失败: ${(error as Error).message}`);
  }
}

/**
 * 发送企业微信webhook消息（机器人）
 */
async function sendWebhookMessage(
  text: string,
  {
    webhookUrl,
    attachments,
  }: {
    webhookUrl: string;
    attachments?: any[];
  }
) {
  const message: WeWorkWebhookMessage = {
    msgtype: "text",
    text: {
      content: text,
    },
  };

  // 如果有附件且包含项目信息，转换为图文消息
  if (attachments && attachments.length > 0) {
    const articles = attachments
      .filter((attachment: any) => attachment.title && attachment.title_link)
      .map((attachment: any) => ({
        title: attachment.title,
        description: attachment.text || attachment.pretext || "",
        url: attachment.title_link,
        picurl: attachment.thumb_url,
      }));

    if (articles.length > 0) {
      message.msgtype = "news";
      message.news = { articles };
      delete message.text;
    }
  }

  debug("Webhook Message Request", message);
  
  try {
    const result = await fetch(webhookUrl, {
      method: "POST",
      body: JSON.stringify(message),
      headers: { "content-type": "application/json" },
    });

    if (!result.ok) {
      throw new Error(`企业微信webhook API响应错误: ${result.status} ${result.statusText}`);
    }

    const responseText = await result.text();
    debug("Webhook Message Response", responseText);
    
    const response = JSON.parse(responseText);
    if (response.errcode !== 0) {
      throw new Error(`企业微信webhook API错误: ${response.errmsg}`);
    }

    return true;
  } catch (error) {
    throw new Error(`企业微信webhook消息发送失败: ${(error as Error).message}`);
  }
}

/**
 * 将Slack附件转换为企业微信图文消息格式
 */
export function slackAttachmentToWeWorkNews(attachments: any[]) {
  return attachments
    .filter((attachment: any) => attachment.title && attachment.title_link)
    .map((attachment: any) => ({
      title: attachment.title,
      description: attachment.text || attachment.pretext || "",
      url: attachment.title_link,
      picurl: attachment.thumb_url,
    }));
}

/**
 * 将项目转换为企业微信图文消息格式
 */
export function projectToWeWorkNews<T extends Project>(
  project: T,
  pretext: string
) {
  const url = project.url || `https://github.com/${project.full_name}`;
  const owner = project.full_name.split("/")[0];
  const thumb_url = `https://avatars.githubusercontent.com/u/${project.owner_id}?v=3&s=75`;
  
  return {
    title: project.name,
    description: `${pretext}\n${project.description}`,
    url: url,
    picurl: thumb_url,
  };
} 