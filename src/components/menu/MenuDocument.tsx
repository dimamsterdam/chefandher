
import { Button } from "@/components/ui/button";
import { BookOpen, Printer, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { motion } from "framer-motion";

interface MenuDocumentProps {
  title: string;
  content: string | null;
  isOpen: boolean;
  isGenerating: boolean;
  onToggle: () => void;
  onPrint: (content: string) => void;
}

export const MenuDocument = ({
  title,
  content,
  isOpen,
  isGenerating,
  onToggle,
  onPrint
}: MenuDocumentProps) => {
  return (
    <div className="flex flex-col p-4 glass rounded-lg bg-white transition-colors">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <div className="flex items-center gap-2">
          {content && !isGenerating && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPrint(content)}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
            </Button>
          )}
          {(content === null || isGenerating) ? (
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="text-purple-600"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={`transition-colors ${isOpen ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {isOpen && content && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 pt-4 border-t overflow-hidden"
        >
          <div className="prose prose-purple max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                li: ({ children }) => <li className="text-gray-700">{children}</li>,
                p: ({ children }) => <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
                hr: () => <hr className="my-6 border-gray-200" />,
                blockquote: ({ children }) => (
                  <blockquote className="pl-4 border-l-4 border-purple-200 italic text-gray-700 my-4">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
};
