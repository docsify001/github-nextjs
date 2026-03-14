/**
 * 将 skill 的 description 与 readme 翻译为中文，供 webhook 请求体中的 description_zh、readme_zh 使用。
 * 设计见 docs/SKILL_REPO_MULTI_SKILL_ANALYSIS.md 4.2 节。
 */

const TRANSLATION_API_URL = "https://api.cognitive.microsofttranslator.com/translate";
const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY ?? process.env.NEXT_PUBLIC_AZURE_TRANSLATOR_KEY;
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION ?? process.env.NEXT_PUBLIC_AZURE_TRANSLATOR_REGION;

const TARGET_LANG = "zh-Hans";
/** 单次请求推荐不超过 50k 字符，留余量 */
const MAX_CHARS_PER_REQUEST = 45000;

interface TranslationResponse {
  translations: { text: string; to: string }[];
}

async function translateBatch(texts: string[]): Promise<string[]> {
  if (!AZURE_KEY || !AZURE_REGION) {
    throw new Error("AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION must be set for skill translation");
  }

  const response = await fetch(
    `${TRANSLATION_API_URL}?api-version=3.0&to=${TARGET_LANG}`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts.map((text) => ({ text }))),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure Translator ${response.status}: ${text}`);
  }

  const data = (await response.json()) as TranslationResponse[];
  return data.map((item) => item.translations?.[0]?.text ?? "");
}

/**
 * 翻译单段文本为中文。
 */
export async function translateToZh(text: string): Promise<string> {
  if (!text.trim()) return "";
  const [result] = await translateBatch([text]);
  return result ?? "";
}

/**
 * 将 description 与 readme 翻译为中文。readme 过长时按段分批翻译再拼接。
 */
export async function translateSkillToZh(description: string, readme: string): Promise<{
  descriptionZh: string;
  readmeZh: string;
}> {
  const descriptionZh = description.trim() ? await translateToZh(description) : "";

  let readmeZh = "";
  if (readme.trim()) {
    if (readme.length <= MAX_CHARS_PER_REQUEST) {
      readmeZh = await translateToZh(readme);
    } else {
      const parts = splitMarkdownForTranslation(readme);
      const translated: string[] = [];
      for (let i = 0; i < parts.length; i += 10) {
        const chunk = parts.slice(i, i + 10);
        const batch = await translateBatch(chunk);
        translated.push(...batch);
      }
      readmeZh = translated.join("\n\n");
    }
  }

  return { descriptionZh, readmeZh };
}

/**
 * 将长 Markdown 按段落或二级标题切分为多段，每段尽量不超过 MAX_CHARS_PER_REQUEST。
 */
function splitMarkdownForTranslation(md: string): string[] {
  const parts: string[] = [];
  const maxLen = MAX_CHARS_PER_REQUEST;

  const sections = md.split(/(?=^##\s)/m);
  let current = "";

  for (const section of sections) {
    if (current.length + section.length + 2 <= maxLen) {
      current += (current ? "\n\n" : "") + section;
    } else {
      if (current) parts.push(current);
      if (section.length <= maxLen) {
        current = section;
      } else {
        const subParts = section.match(new RegExp(`[\\s\\S]{1,${maxLen}}(?=\\s|$)`, "g")) ?? [section];
        parts.push(...subParts.filter(Boolean));
        current = "";
      }
    }
  }
  if (current) parts.push(current);

  return parts;
}
