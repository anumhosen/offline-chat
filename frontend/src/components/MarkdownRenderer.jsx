import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { VscCopy, VscCheck } from 'react-icons/vsc';
import { useState } from 'react';

export default function MarkdownRenderer({ content }) {
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const codeId = Math.random().toString(36).slice(2);
          
          return !inline && match ? (
            <div className="my-4 rounded-xl overflow-hidden border border-gray-700/50 bg-[#011627]">
              {/* Code Header */}
              <div className="flex items-center justify-between px-4 py-1 bg-gray-800/50 border-b border-gray-700/30">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                    {match[1]}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(codeString, codeId)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-300 
                             hover:bg-gray-700/50 rounded transition-colors"
                >
                  {copiedCode === codeId ? (
                    <span className='flex items-center pt-0.5'><VscCheck className="w-3.5 h-3.5 pb-0.5 text-green-400" /> Copied</span>
                  ) : (
                    <span className='flex items-center pt-0.5'><VscCopy className="w-3.5 h-3.5 pb-0.5" /> Copy</span>
                  )}
                </button>
              </div>
              
              {/* Code Content */}
              <div className="text-sm leading-relaxed">
                <SyntaxHighlighter
                  style={nightOwl}  // 👈 Change this line to any style above
                  language={match[1]}
                  PreTag="div"
                  showLineNumbers={codeString.split('\n').length > 3}
                  wrapLines={true}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: '#011627',
                    fontSize: '13px',
                    lineHeight: '1.6',
                  }}
                  lineNumberStyle={{
                    color: '#4a5568',
                    fontSize: '12px',
                    marginRight: '12px',
                  }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            </div>
          ) : (
            <code className="bg-gray-800/80 text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="text-gray-300 leading-relaxed mb-3 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-100 mb-4 mt-6">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-200 mb-3 mt-5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-300 mb-2 mt-4">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-medium text-gray-400 mb-2 mt-3">{children}</h4>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 text-gray-300 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 text-gray-300 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-indigo-500 pl-4 my-3 text-gray-400 italic bg-gray-800/20 py-2 rounded-r">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} className="text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/30" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-semibold text-gray-200">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-400">{children}</em>,
        hr: () => <hr className="my-6 border-gray-800" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-4 rounded-lg border border-gray-700/50">
            <table className="min-w-full text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="bg-gray-800/50 text-gray-300 px-4 py-2 text-left font-medium border-b border-gray-700/50">{children}</th>
        ),
        td: ({ children }) => (
          <td className="text-gray-400 px-4 py-2 border-b border-gray-800/50">{children}</td>
        ),
      }}
    >
      {content || ''}
    </ReactMarkdown>
  );
}