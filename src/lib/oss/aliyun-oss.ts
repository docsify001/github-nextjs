import OSS from 'ali-oss';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as prettier from "prettier";

export class AliyunOSSClient {
  private client: OSS | null = null;

  private getClient(): OSS {
    if (!this.client) {
      const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
      const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
      const bucket = process.env.ALIYUN_OSS_BUCKET;
      const region = process.env.ALIYUN_OSS_REGION;

      if (!accessKeyId || !accessKeySecret || !bucket || !region) {
        throw new Error('阿里云OSS配置缺失，请检查环境变量');
      }

      this.client = new OSS({
        accessKeyId,
        accessKeySecret,
        bucket,
        region,
        secure: true, // 使用HTTPS
      });
    }
    return this.client;
  }

  /**
   * 从URL下载文件并上传到OSS
   * @param url 文件URL
   * @param ossPath OSS中的存储路径
   * @returns 上传后的URL
   */
  async uploadFromUrl(url: string, ossPath: string): Promise<string> {
    try {
      // 下载文件到临时目录
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载文件失败: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const tempPath = join(tmpdir(), `${Date.now()}-${Math.random().toString(36).substring(7)}`);
      
      // 写入临时文件
      await writeFile(tempPath, Buffer.from(buffer));

      // 上传到OSS
      const result = await this.getClient().put(ossPath, tempPath);
      
      // 清理临时文件
      await writeFile(tempPath, ''); // 清空文件内容
      
      return result.url;
    } catch (error) {
      console.error('上传文件到OSS失败:', error);
      throw error;
    }
  }

  /**
   * 上传Buffer到OSS
   * @param buffer 文件buffer
   * @param ossPath OSS中的存储路径
   * @returns 上传后的URL
   */
  async uploadBuffer(buffer: Buffer, ossPath: string): Promise<string> {
    try {
      const result = await this.getClient().put(ossPath, buffer);
      return result.url;
    } catch (error) {
      console.error('上传Buffer到OSS失败:', error);
      throw error;
    }
  }

  /**
   * 生成OSS文件路径
   * @param type 文件类型 (icon, og-image, readme-images)
   * @param repoName 仓库名称
   * @param fileName 文件名
   * @returns OSS路径
   */
  generateOSSPath(type: 'icon' | 'og-image' | 'readme-images', repoName: string, fileName: string): string {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop() || 'png';
    return `mcp/repos/${repoName}/${type}/${timestamp}.${extension}`;
  }

  /**
   * 检查文件是否已存在
   * @param ossPath OSS路径
   * @returns 是否存在
   */
  async exists(ossPath: string): Promise<boolean> {
    try {
      await this.getClient().head(ossPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 保存JSON文件到OSS
   * @param json JSON数据
   * @param fileName 文件名
   * @returns 保存后的OSS URL
   */
  async saveJSON(json: unknown, fileName: string): Promise<string> {
    try {
      // 格式化JSON
      const formattedJson = await prettier.format(JSON.stringify(json), {
        parser: "json",
      });

      // 生成OSS路径
      const ossPath = `json-files/${fileName}`;
      
      // 上传到OSS
      const result = await this.getClient().put(ossPath, Buffer.from(formattedJson, 'utf-8'), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`JSON文件已保存到OSS: ${result.url}`);
      return result.url;
    } catch (error) {
      console.error('保存JSON文件到OSS失败:', error);
      throw error;
    }
  }

  /**
   * 从OSS读取JSON文件
   * @param fileName 文件名
   * @returns JSON数据
   */
  async readJSON(fileName: string): Promise<any> {
    try {
      const ossPath = `json-files/${fileName}`;
      
      // 从OSS下载文件
      const result = await this.getClient().get(ossPath);
      const jsonString = result.content.toString('utf-8');
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('从OSS读取JSON文件失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const aliyunOSSClient = new AliyunOSSClient(); 