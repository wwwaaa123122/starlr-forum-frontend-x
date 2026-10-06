/** 404 页 */
import { useNavigate } from 'react-router-dom';
import { Telescope } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui/primitives';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<Telescope size={48} strokeWidth={1.2} />}
      title="这片星域不存在"
      description="你也许点进了一个已熄灭的坐标"
      action={
        <Button pill onClick={() => navigate('/')}>
          返回首页
        </Button>
      }
    />
  );
}
