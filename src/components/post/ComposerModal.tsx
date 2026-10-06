/** 桌面端发帖弹窗（移动端跳转 /compose 整页） */
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Modal, IconButton } from '@/components/ui/primitives';
import { Composer } from './Composer';

export function ComposerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-[600px]"
      closeOnBackdrop={false}
    >
      <div className="flex h-14 items-center px-2">
        <IconButton
          label="关闭"
          onClick={() => {
            onClose();
            navigate(0);
          }}
        >
          <X size={19} />
        </IconButton>
        <span className="ml-3 text-lg font-extrabold">发帖</span>
      </div>
      <div className="border-t border-line pb-3">
        <Composer mode="post" autoFocus onDone={onClose} />
      </div>
    </Modal>
  );
}
