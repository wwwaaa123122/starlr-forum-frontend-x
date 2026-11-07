import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TriangleAlert, House, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/primitives';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React 错误边界：捕获子树渲染期异常，避免整站白屏。
 * 顶层包裹整个应用（main.tsx），路由级包裹 <Routes>（App.tsx）。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <TriangleAlert className="size-8 text-danger" aria-hidden />
        <p className="text-base font-bold text-ink">页面出错了</p>
        <p className="max-w-sm text-sm text-muted">
          页面渲染时发生异常，请重试或返回首页。若反复出现，请刷新页面或稍后再来。
        </p>
        {import.meta.env?.DEV && (
          <pre className="max-w-md overflow-auto rounded-xl border border-line bg-surface2 p-3 text-left text-xs text-muted">
            {error.message}
          </pre>
        )}
        <div className="mt-1 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={this.reset}>
            <RotateCcw className="size-4" aria-hidden />
            重试
          </Button>
          <Button variant="outline" size="sm" onClick={this.reload}>
            刷新页面
          </Button>
          <Link
            to="/"
            className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 text-[13px] font-bold text-white transition active:scale-[0.97]"
          >
            回首页
          </Link>
        </div>
      </div>
    );
  }
}
