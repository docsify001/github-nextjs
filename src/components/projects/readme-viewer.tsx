"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FileText, Globe, Languages } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReadmeViewerProps {
  readmeContent?: string | null;
  readmeContentZh?: string | null;
  description?: string | null;
  descriptionZh?: string | null;
  iconUrl?: string | null;
  openGraphImageOssUrl?: string | null;
}

export function ReadmeViewer({
  readmeContent,
  readmeContentZh,
  description,
  descriptionZh,
  iconUrl,
  openGraphImageOssUrl,
}: ReadmeViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'zh' | 'en'>('zh');

  const hasReadme = readmeContent || readmeContentZh;
  const hasDescription = description || descriptionZh;
  const hasAssets = iconUrl || openGraphImageOssUrl;

  if (!hasReadme && !hasDescription && !hasAssets) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            项目详情
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-6">
          {/* 项目描述 */}
          {hasDescription && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                项目描述
              </h3>
              <div className="space-y-2">
                {description && (
                  <div>
                    <Badge variant="outline" className="mb-2">英文</Badge>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                )}
                {descriptionZh && (
                  <div>
                    <Badge variant="outline" className="mb-2">中文</Badge>
                    <p className="text-sm">{descriptionZh}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 项目资源 */}
          {hasAssets && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">项目资源</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {iconUrl && (
                  <div className="space-y-2">
                    <Badge variant="secondary">项目图标</Badge>
                    <div className="flex items-center gap-2">
                      <img 
                        src={iconUrl} 
                        alt="项目图标" 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <a 
                        href={iconUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        查看原图
                      </a>
                    </div>
                  </div>
                )}
                {openGraphImageOssUrl && (
                  <div className="space-y-2">
                    <Badge variant="secondary">Open Graph 图片</Badge>
                    <div className="flex items-center gap-2">
                      <img 
                        src={openGraphImageOssUrl} 
                        alt="Open Graph 图片" 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <a 
                        href={openGraphImageOssUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        查看原图
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* README 内容 */}
          {hasReadme && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Languages className="h-4 w-4" />
                README 文档
              </h3>
              
              {/* 语言切换按钮 */}
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'zh' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('zh')}
                  disabled={!readmeContentZh}
                >
                  中文
                </Button>
                <Button
                  variant={activeTab === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('en')}
                  disabled={!readmeContent}
                >
                  英文
                </Button>
              </div>
              
              {/* README 内容 */}
              <div className="mt-4">
                {activeTab === 'zh' && readmeContentZh ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 自定义链接组件，确保外部链接在新窗口打开
                        a: ({ href, children, ...props }) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            {...props}
                          >
                            {children}
                          </a>
                        ),
                        // 自定义图片组件，添加样式
                        img: ({ src, alt, ...props }) => (
                          <img 
                            src={src} 
                            alt={alt} 
                            className="max-w-full h-auto rounded-lg shadow-sm"
                            {...props}
                          />
                        ),
                        // 自定义代码块组件
                        code: ({ className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match;
                          return !isInline ? (
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {readmeContentZh}
                    </ReactMarkdown>
                  </div>
                ) : activeTab === 'en' && readmeContent ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 自定义链接组件，确保外部链接在新窗口打开
                        a: ({ href, children, ...props }) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            {...props}
                          >
                            {children}
                          </a>
                        ),
                        // 自定义图片组件，添加样式
                        img: ({ src, alt, ...props }) => (
                          <img 
                            src={src} 
                            alt={alt} 
                            className="max-w-full h-auto rounded-lg shadow-sm"
                            {...props}
                          />
                        ),
                        // 自定义代码块组件
                        code: ({ className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match;
                          return !isInline ? (
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {readmeContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {activeTab === 'zh' ? '暂无中文 README' : '暂无英文 README'}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
} 