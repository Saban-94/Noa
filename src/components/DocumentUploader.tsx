import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface DocumentUploaderProps {
  orderId: string;
  onUploadComplete?: (data: any) => void;
  className?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ orderId, onUploadComplete, className }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
      setError('סוג קובץ לא נתמך. אנא העלו PNG, JPEG או PDF.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;
      const pureBase64 = base64Data.split(',')[1];

      // Send to backend for analysis (Noa the Brain)
      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          fileData: pureBase64,
          mimeType: file.type,
          fileName: file.name
        }),
      });

      if (!response.ok) throw new Error('נכשל בניתוח המסמך');

      const result = await response.json();
      setSuccess(true);
      onUploadComplete?.(result);

      // Reset success state after a delay
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'שגיאה בהעלאה');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative p-3 rounded-2xl transition-all shadow-md group",
          isUploading ? "bg-slate-100 cursor-wait" : 
          success ? "bg-emerald-100 text-emerald-600" :
          error ? "bg-red-100 text-red-600" :
          isDragOver ? "bg-blue-600 text-white scale-110 shadow-lg" :
          "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
        )}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 size={20} />
            </motion.div>
          ) : success ? (
            <motion.div
              key="success"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <CheckCircle2 size={20} />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Paperclip size={20} className={cn("transition-transform group-hover:rotate-12", isDragOver && "text-white")} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Tooltip/Overlay */}
        <AnimatePresence>
          {(isUploading || error || success) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn(
                "absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap shadow-xl z-50 pointer-events-none",
                isUploading ? "bg-slate-800 text-white" :
                success ? "bg-emerald-600 text-white" :
                "bg-red-600 text-white"
              )}
            >
              {isUploading ? "נועה מנתחת מסמך..." :
               success ? "מסמך הועלה ונותח בהצלחה!" :
               error}
              <div className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-8 border-transparent",
                isUploading ? "border-t-slate-800" :
                success ? "border-t-emerald-600" :
                "border-t-red-600"
              )} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
        accept="image/png,image/jpeg,application/pdf"
      />
    </div>
  );
};
