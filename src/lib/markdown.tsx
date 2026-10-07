/** Markdown 渲染（服务端已严格 sanitize 的白名单策略在客户端保持一致：不引入 rehype-raw） */
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { cn } from './utils';
import { assetUrl } from '@/lib/base-url';

/** 仅允许 http/https/mailto 协议的链接（与后端 CSP 约定一致） */
const schema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'relative'],
  },
};

interface RichTextProps {
  content: string;
  className?: string;
}

export const RichText = memo(function RichText({ content, className }: RichTextProps) {
  return (
    <div className={cn('rich-text text-[15px] break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, schema],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ]}
        components={{
          a: ({ href, children }) => (
            <a href={assetUrl(href)} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
