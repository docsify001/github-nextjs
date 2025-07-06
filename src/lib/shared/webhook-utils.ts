/**
 * Webhook工具函数
 * 支持发送到多个webhook地址
 */

export interface WebhookPayload {
  [key: string]: any;
}

export interface WebhookOptions {
  token?: string;
  timestamp?: string;
  signature?: string;
}

/**
 * 发送webhook到多个地址
 * @param webhookUrls 多个webhook URL，用分号分隔
 * @param payload webhook数据
 * @param options 选项
 * @param dryRun 是否为试运行模式
 * @returns 发送结果数组
 */
export async function sendWebhookToMultipleUrls(
  webhookUrls: string,
  payload: WebhookPayload,
  options: WebhookOptions = {},
  dryRun: boolean = false
): Promise<{ url: string; success: boolean; error?: string }[]> {
  if (!webhookUrls) {
    return [];
  }

  // 分割多个URL
  const urls = webhookUrls.split(';').map(url => url.trim()).filter(url => url.length > 0);
  
  if (urls.length === 0) {
    return [];
  }

  if (dryRun) {
    console.log("DRY RUN: Would send webhook to", urls);
    console.log("Data:", payload);
    return urls.map(url => ({ url, success: false }));
  }

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-timestamp': options.timestamp || new Date().toISOString(),
            'x-webhook-signature': options.signature || options.token || "",
            ...(options.token && { 'Authorization': `Bearer ${options.token}` }),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Webhook request failed with status ${response.status}: ${response.statusText}`);
        }

        return { url, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send webhook to ${url}:`, error);
        return { url, success: false, error: errorMessage };
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return { 
        url: urls[index], 
        success: false, 
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      };
    }
  });
}

/**
 * 检查是否有成功的webhook发送
 * @param results webhook发送结果
 * @returns 是否有成功的发送
 */
export function hasSuccessfulWebhook(results: { success: boolean }[]): boolean {
  return results.some(result => result.success);
}

/**
 * 获取webhook发送统计
 * @param results webhook发送结果
 * @returns 统计信息
 */
export function getWebhookStats(results: { success: boolean }[]) {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  
  return { total, successful, failed };
} 