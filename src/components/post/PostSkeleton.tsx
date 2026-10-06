/** 帖子骨架屏（信息流加载占位） */
import { Skeleton } from '@/components/ui/primitives';

export function PostSkeleton() {
  return (
    <div className="border-b border-line px-4 py-4">
      <div className="flex gap-3">
        <Skeleton className="h-[42px] w-[42px] shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-8 pt-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
