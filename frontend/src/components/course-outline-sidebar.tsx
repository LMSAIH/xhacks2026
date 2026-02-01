import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OutlineSection {
  id: string;
  number: string;
  title: string;
  description?: string;
  duration?: string;
  isCompleted?: boolean;
  children?: OutlineSection[];
}

interface CourseOutlineSidebarProps {
  topic: string;
  sections?: OutlineSection[];
  activeSectionId?: string;
  onSectionClick?: (sectionId: string) => void;
}

export function CourseOutlineSidebar({
  topic,
  sections = [],
  activeSectionId,
  onSectionClick,
}: CourseOutlineSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const renderOutlineItem = (item: OutlineSection, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const isActive = item.id === activeSectionId;

    return (
      <div key={item.id} className="relative">
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => {
              if (hasChildren) {
                toggleSection(item.id);
              }
              onSectionClick?.(item.id);
            }}
            className={cn(
              "!h-auto min-h-8 py-2 !overflow-visible",
              level > 0 && "ml-4",
              item.isCompleted && "opacity-60",
              isActive && "bg-accent"
            )}
            style={{ overflow: 'visible' }}
          >
            <span className="text-xs font-mono text-muted-foreground shrink-0 self-start mt-0.5">
              {item.number}
            </span>
            <span 
              className={cn(
                "flex-1 leading-snug",
                item.isCompleted && "line-through text-muted-foreground",
                isActive && "font-medium"
              )}
              style={{ 
                whiteSpace: 'normal', 
                overflow: 'visible',
                textOverflow: 'clip',
                wordBreak: 'break-word'
              }}
            >
              {item.title}
            </span>
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform shrink-0 self-start mt-0.5",
                  isExpanded && "rotate-90"
                )}
              />
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="border-l border-border ml-4">
            {item.children?.map((child) => renderOutlineItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sidebar className="border-r border-border bg-background">
      <SidebarHeader className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold leading-tight line-clamp-2">
            {topic}
          </h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel>Course Outline</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.length > 0 ? (
                  sections.map((section) => renderOutlineItem(section))
                ) : (
                  <div className="px-3 py-12 text-center">
                    <p className="text-xs text-muted-foreground">
                      No outline available
                    </p>
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
