import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
export const categories = ['编码转换', '数据处理', '日期时间', '开发辅助', '网络工具'] as const;
export type ToolCategory = (typeof categories)[number];
export interface ToolDefinition {
  name: string;
  slug: string;
  path: `/tools/${string}`;
  category: ToolCategory;
  keywords: string[];
  description: string;
  icon: LucideIcon;
  component: ComponentType;
}
