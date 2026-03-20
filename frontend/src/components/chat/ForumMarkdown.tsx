'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ForumMarkdownProps {
  markdown: string;
  className?: string;
}

export function ForumMarkdown({ markdown, className = '' }: ForumMarkdownProps) {
  return (
    <div className={`forum-md text-[15px] leading-relaxed text-dc-channel-text-active ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 border-b border-white/10 pb-2 text-2xl font-bold first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-xl font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>
          ),
          h4: ({ children }) => <h4 className="mb-2 mt-3 text-base font-semibold">{children}</h4>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-6 marker:text-dc-channel-text">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-6 marker:text-dc-channel-text">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-4 border-[#5865f2]/70 pl-4 text-dc-channel-text italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-white/10" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00a8fc] underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-dc-channel-text-active">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="text-dc-channel-text line-through">{children}</del>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-white/10 px-3 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
          tr: ({ children }) => <tr>{children}</tr>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg border border-white/10 bg-[#0d0e10] p-3 text-[13px] leading-relaxed">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = typeof className === 'string' && className.includes('language-');
            if (isBlock) {
              return (
                <code className={`block font-mono text-[13px] text-[#e6edf3] ${className || ''}`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#ededef]"
                {...props}
              >
                {children}
              </code>
            );
          },
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2 align-middle"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {markdown || '（无正文）'}
      </ReactMarkdown>
    </div>
  );
}
