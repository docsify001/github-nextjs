"use client";

import { schema } from "@/drizzle/database";
import { ProjectDetails } from "@/drizzle/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateOnly, formatStars } from "@/lib/format-helpers";
import { ChevronDown, ChevronRight, Expand, Minimize } from "lucide-react";
import { useRepoSections, RepoSection } from "@/hooks/use-repo-sections";
import { ViewRelatedProjects } from "./view-related-projects";
import { ViewTrends } from "./view-trends";

type Props = {
  project: ProjectDetails;
  relatedProjectsData?: {
    sameRepoProjects: any[];
    sameOwnerProjects: any[];
  };
};

export function ViewRepo({ project, relatedProjectsData }: Props) {
  const repo = project.repo;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <div>
            GitHub 仓库
            {repo.archived && (
              <Badge variant="destructive" className="ml-2 text-lg">
                已归档
              </Badge>
            )}
          </div>
          <div>{formatStars(repo.stars)}</div>
        </CardTitle>
        <CardDescription>
          <code>{repo.id}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <ViewRepoData repo={repo} />
          <Separator />
          <ViewTrends snapshots={repo.snapshots} />
          <Separator />
          <ViewRelatedProjects project={project} relatedProjectsData={relatedProjectsData} />
        </div>
      </CardContent>
    </Card>
  );
}

function ViewRepoData({ repo }: { repo: typeof schema.repos.$inferSelect }) {
  const { 
    expandedSections, 
    toggleSection, 
    expandAll, 
    collapseAll, 
    isExpanded 
  } = useRepoSections();

  const SectionHeader = ({ 
    title, 
    section, 
    hasData = true 
  }: { 
    title: string; 
    section: RepoSection; 
    hasData?: boolean;
  }) => (
    <Button
      variant="ghost"
      className="h-auto p-0 justify-start font-medium text-base"
      onClick={() => toggleSection(section)}
      disabled={!hasData}
    >
      {isExpanded(section) ? (
        <ChevronDown className="h-4 w-4 mr-2" />
      ) : (
        <ChevronRight className="h-4 w-4 mr-2" />
      )}
      {title}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Section Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={expandAll}
          className="flex items-center gap-1"
        >
          <Expand className="h-3 w-3" />
          展开全部
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={collapseAll}
          className="flex items-center gap-1"
        >
          <Minimize className="h-3 w-3" />
          折叠全部
        </Button>
      </div>

      {/* Basic Information */}
      <div>
        <SectionHeader title="基础信息" section="basic" />
        {isExpanded('basic') && (
          <div className="grid grid-cols-[200px_1fr] gap-4 mt-4">
            <p>仓库全名</p>
            <p>
              <a
                href={`https://github.com/${repo.owner}/${repo.name}`}
                className="hover:underline"
              >
                {repo.owner}/{repo.name}
              </a>
            </p>
            <p>描述</p>
            <p>{repo.description}</p>
            <p>主页</p>
            <p>
              {repo.homepage ? (
                <a href={repo.homepage} className="hover:underline">
                  {repo.homepage}
                </a>
              ) : (
                <i className="text-muted-foreground">无主页</i>
              )}
            </p>
            <p>创建时间</p>
            <p>{formatDateOnly(repo.created_at)}</p>
            <p>最后提交</p>
            <p>{repo.last_commit ? formatDateOnly(repo.last_commit) : "-"}</p>
            <p>推送时间</p>
            <p>{formatDateOnly(repo.pushed_at)}</p>
            <p>提交数量</p>
            <p>{repo.commit_count}</p>
            <p>贡献者</p>
            <p>{repo.contributor_count}</p>
          </div>
        )}
      </div>

      {/* Activity & Engagement */}
      <div>
        <SectionHeader 
          title="活动与参与度" 
          section="activity" 
          hasData={!!(repo.mentionable_users_count || repo.watchers_count || repo.pull_requests_count || repo.releases_count || repo.forks)}
        />
        {isExpanded('activity') && (
          <div className="grid grid-cols-[200px_1fr] gap-4 mt-4">
            <p>可提及用户</p>
            <p>{repo.mentionable_users_count || "-"}</p>
            <p>关注者</p>
            <p>{repo.watchers_count || "-"}</p>
            <p>拉取请求</p>
            <p>{repo.pull_requests_count || "-"}</p>
            <p>发布</p>
            <p>{repo.releases_count || "-"}</p>
            <p>Fork</p>
            <p>{repo.forks || "-"}</p>
          </div>
        )}
      </div>

      {/* Technical Details */}
      <div>
        <SectionHeader 
          title="技术详情" 
          section="technical" 
          hasData={!!(repo.license_spdx_id || repo.languages)}
        />
        {isExpanded('technical') && (
          <div className="grid grid-cols-[200px_1fr] gap-4 mt-4">
            <p>许可证</p>
            <p>{repo.license_spdx_id || "-"}</p>
            <p>编程语言</p>
            <div>
              {repo.languages && Array.isArray(repo.languages) ? (
                <div className="flex flex-wrap gap-1">
                  {repo.languages.map((lang: any, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {lang.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                "-"
              )}
            </div>
          </div>
        )}
      </div>

      {/* Social Media & Branding */}
      <div>
        <SectionHeader 
          title="社交媒体与品牌" 
          section="social" 
          hasData={!!(repo.open_graph_image_url || repo.uses_custom_open_graph_image !== null)}
        />
        {isExpanded('social') && (
          <div className="grid grid-cols-[200px_1fr] gap-4 mt-4">
            <p>Open Graph 图片</p>
            <p>
              {repo.open_graph_image_url ? (
                <a href={repo.open_graph_image_url} className="hover:underline" target="_blank" rel="noopener noreferrer">
                  查看图片
                </a>
              ) : (
                <i className="text-muted-foreground">无自定义图片</i>
              )}
            </p>
            <p>使用自定义 OG 图片</p>
            <p>{repo.uses_custom_open_graph_image ? "是" : "否"}</p>
          </div>
        )}
      </div>

      {/* Latest Release */}
      {repo.latest_release_name && (
        <div>
          <SectionHeader title="最新发布" section="release" />
          {isExpanded('release') && (
            <div className="grid grid-cols-[200px_1fr] gap-4 mt-4">
              <p>发布名称</p>
              <div className="flex items-center gap-2">
                <span className="font-medium">{repo.latest_release_name}</span>
                {repo.latest_release_tag_name && (
                  <Badge variant="outline" className="text-xs">
                    {repo.latest_release_tag_name}
                  </Badge>
                )}
              </div>
              <p>发布时间</p>
              <p>
                {repo.latest_release_published_at ? 
                  formatDateOnly(repo.latest_release_published_at) : 
                  "-"
                }
              </p>
              <p>发布链接</p>
              <p>
                {repo.latest_release_url ? (
                  <a href={repo.latest_release_url} className="hover:underline" target="_blank" rel="noopener noreferrer">
                    查看发布
                  </a>
                ) : (
                  "-"
                )}
              </p>
              {repo.latest_release_description && (
                <>
                  <p>描述</p>
                  <p className="text-sm text-muted-foreground">
                    {repo.latest_release_description}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
