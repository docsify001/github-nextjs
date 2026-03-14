/**
 * 将解析后的 skill 数据组装为 web skills webhook 请求体并发送。
 * 不传 repo 统计，由 web 端从 repos 表读取并写入 app（设计 5.2）。
 */

export interface SkillWebhookPayload {
  event_type: "skill_updated";
  timestamp: string;
  data: {
    repo_full_name: string;
    repo_name: string;
    repo_owner: string;
    skill_dir: string;
    name: string;
    description: string;
    description_zh: string;
    readme: string;
    readme_zh: string;
    version?: string | null;
    category_id?: string | null;
    features?: string[] | null;
    scenario?: string | null;
    license?: string | null;
    tools?: string[] | null;
  };
}

export function buildSkillWebhookPayload(params: {
  repoOwner: string;
  repoName: string;
  skillDir: string;
  name: string;
  description: string;
  descriptionZh: string;
  readme: string;
  readmeZh: string;
  version?: string | null;
  categoryId?: string | null;
  features?: string[] | null;
  scenario?: string | null;
  license?: string | null;
  tools?: string[] | null;
}): SkillWebhookPayload {
  const repoFullName = `${params.repoOwner}/${params.repoName}`;
  return {
    event_type: "skill_updated",
    timestamp: new Date().toISOString(),
    data: {
      repo_full_name: repoFullName,
      repo_name: params.repoName,
      repo_owner: params.repoOwner,
      skill_dir: params.skillDir,
      name: params.name,
      description: params.description,
      description_zh: params.descriptionZh,
      readme: params.readme,
      readme_zh: params.readmeZh,
      version: params.version ?? null,
      category_id: params.categoryId ?? null,
      features: params.features ?? null,
      scenario: params.scenario ?? null,
      license: params.license ?? null,
      tools: params.tools ?? null,
    },
  };
}

export async function sendSkillToWeb(
  webhookUrl: string,
  payload: SkillWebhookPayload,
  options: { token?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-timestamp": payload.timestamp,
      "x-webhook-signature": options.token ?? "",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `${res.status}: ${text}` };
  }
  return { success: true };
}
