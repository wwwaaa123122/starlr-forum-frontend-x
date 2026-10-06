/** 发帖页：桌面端以弹窗卡呈现（X 式模态），移动端整页 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { IconButton } from '@/components/ui/primitives';
import { Composer } from '@/components/post/Composer';

export default function Compose() {
  const navigate = useNavigate();

  // 桌面端：居中卡片 + 遮罩（与 X 的模态一致，但保留 URL 可回退）
  return (
    <div className="min-h-dvh md:fixed md:inset-0 md:z-50 md:flex md:items-start md:justify-center md:bg-black/60 md:p-4 md:backdrop-blur-sm md:pt-24">
      <div className="md:w-full md:max-w-[600px] md:rounded-2xl md:border md:border-line md:bg-canvas md:shadow-2xl">
        {/* 移动端顶栏：返回 + 标题 */}
        <div className="flex h-14 items-center gap-3 border-b border-line px-3 md:hidden">
          <IconButton label="返回" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </IconButton>
          <span className="text-lg font-extrabold">发帖</span>
        </div>
        {/* 桌面端关闭钮 */}
        <div className="hidden h-14 items-center px-2 md:flex">
          <IconButton
            label="关闭"
            onClick={() => navigate(-1)}
          >
            <X size={19} />
          </IconButton>
          <span className="ml-3 text-lg font-extrabold">发帖</span>
        </div>
        <div className="border-b border-line pb-3 md:border-none">
          <Composer mode="post" autoFocus onDone={() => navigate(-1)} />
        </div>
      </div>
      {/* 遮罩点击关闭（仅桌面） */}
      <div className="absolute inset-0 -z-10 hidden md:block" onClick={() => navigate(-1)} aria-hidden />
    </div>
  );
}
