/**
 * 翻译工具类
 * 使用Vercel AI SDK和OpenAI进行中英文翻译
 * 保持文档结构，只翻译必要的内容
 */

import { generateText } from 'ai';
import { createOpenAIInstance } from '../ai/provider';

export class Translator {
  /**
   * 翻译文本为中文
   * @param text 要翻译的文本
   * @returns 翻译后的中文文本
   */
  async translateToChinese(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return '';
    }

    try {
      const { text: translatedText } = await generateText({
        model: createOpenAIInstance(),
        prompt: `请将以下文本翻译成中文，保持原有的格式和结构，只翻译文本内容，不要翻译代码、URL、文件名、变量名等技术术语：

${text}

翻译要求：
1. 保持原有的换行、缩进、标点符号等格式
2. 不要翻译代码块、URL、文件名、变量名、函数名等技术术语
3. 只翻译自然语言文本内容
4. 保持Markdown格式（如#标题、**粗体**、*斜体*等）
5. 如果原文已经是中文，直接返回原文

翻译结果：`,
        temperature: 0.3,
      });

      return translatedText || text;
    } catch (error) {
      console.error('翻译失败:', error);
      // 如果翻译失败，返回原文
      return text;
    }
  }

  /**
   * 检测文本语言
   * @param text 要检测的文本
   * @returns 语言代码
   */
  async detectLanguage(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return 'en';
    }

    try {
      const { text: detectedLanguage } = await generateText({
        model: createOpenAIInstance(),
        prompt: `请检测以下文本的语言，只返回语言代码（如：zh、en、ja等）：

${text}

语言代码：`,
        maxTokens: 10,
        temperature: 0,
      });

      const language = detectedLanguage.trim().toLowerCase();
      return language || 'en';
    } catch (error) {
      console.error('语言检测失败:', error);
      return 'en';
    }
  }

  /**
   * 判断文本是否为中文
   * @param text 要检查的文本
   * @returns 是否为中文
   */
  isChinese(text: string): boolean {
    if (!text) return false;
    
    // 简单的中文检测：检查是否包含中文字符
    const chineseRegex = /[\u4e00-\u9fff]/;
    return chineseRegex.test(text);
  }

  /**
   * 翻译项目描述
   * @param description 项目描述
   * @returns 翻译后的描述
   */
  async translateDescription(description: string): Promise<string> {
    if (!description) return '';
    
    // 如果已经是中文，直接返回
    if (this.isChinese(description)) {
      return description;
    }
    
    return await this.translateToChinese(description);
  }

  /**
   * 翻译README内容
   * @param readmeContent README内容
   * @returns 翻译后的README内容
   */
  async translateReadme(readmeContent: string): Promise<string> {
    if (!readmeContent) return '';
    
    // 如果已经是中文，直接返回
    if (this.isChinese(readmeContent)) {
      return readmeContent;
    }
    
    try {
      const { text: translatedContent } = await generateText({
        model: createOpenAIInstance(),
        prompt: `请将以下README文档翻译成中文，严格保持原有的文档结构和格式：

${readmeContent}

翻译要求：
1. 保持所有Markdown格式（标题层级、列表、代码块、链接等）
2. 不要翻译代码块中的内容、URL、文件名、变量名等技术术语
3. 保持原有的换行、缩进、空行等格式
4. 只翻译自然语言文本内容
5. 保持表格结构，只翻译表头和内容文本
6. 保持图片链接和alt文本格式
7. 保持徽章（badge）的格式不变

翻译结果：`,
        maxTokens: 8000,
        temperature: 0.2,
      });

      return translatedContent || readmeContent;
    } catch (error) {
      console.error('README翻译失败:', error);
      return readmeContent;
    }
  }

  /**
   * 翻译Release Note内容
   * @param releaseDescription Release Note内容
   * @returns 翻译后的Release Note内容
   */
  async translateReleaseNote(releaseDescription: string): Promise<string> {
    if (!releaseDescription) return '';
    
    // 如果已经是中文，直接返回
    if (this.isChinese(releaseDescription)) {
      return releaseDescription;
    }

    try {
      const { text: translatedContent } = await generateText({
        model: createOpenAIInstance(),
        prompt: `请将以下Release Note翻译成中文，保持原有的格式和结构：

${releaseDescription}

翻译要求：
1. 保持版本号、日期等格式不变
2. 保持列表格式和缩进
3. 不要翻译技术术语、函数名、变量名等
4. 只翻译功能描述、修复说明等自然语言内容
5. 保持链接格式不变
6. 保持代码示例格式不变

翻译结果：`,
        maxTokens: 4000,
        temperature: 0.3,
      });

      return translatedContent || releaseDescription;
    } catch (error) {
      console.error('Release Note翻译失败:', error);
      return releaseDescription;
    }
  }

  /**
   * 智能翻译文档内容
   * @param content 文档内容
   * @param contentType 内容类型（'readme' | 'description' | 'release' | 'general'）
   * @returns 翻译后的内容
   */
  async smartTranslate(content: string, contentType: 'readme' | 'description' | 'release' | 'general' = 'general'): Promise<string> {
    if (!content) return '';
    
    // 如果已经是中文，直接返回
    if (this.isChinese(content)) {
      return content;
    }

    switch (contentType) {
      case 'readme':
        return await this.translateReadme(content);
      case 'description':
        return await this.translateDescription(content);
      case 'release':
        return await this.translateReleaseNote(content);
      default:
        return await this.translateToChinese(content);
    }
  }
}

// 创建单例实例
export const translator = new Translator(); 