"use client";

import { useState, useRef, useEffect } from "react";
import { uploadItem } from "@/lib/api";
import type { WardrobeItem } from "@/lib/types";

interface UploadFlowProps {
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadFlow({ onClose, onUploaded }: UploadFlowProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<WardrobeItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const item = await uploadItem(file, desc || undefined);
      setResult(item);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setDesc("");
    setResult(null);
    setError(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
        <div className="mx-auto w-12 py-3">
          <div className="h-1 rounded-full bg-zinc-300" />
        </div>

        <div className="px-5 pb-6">
          <h3 className="mb-4 font-serif text-lg font-semibold">录入衣物</h3>

          {result ? (
            /* Result card */
            <div>
              <div className="mb-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
                识别成功！已录入为 {[result.category, result.subcategory].filter(Boolean).join(" · ")}
              </div>
              {result.description && (
                <p className="mb-3 text-sm text-zinc-600">{result.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                {result.colors?.map((c, i) => (
                  <span key={i} className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{c}</span>
                ))}
                {result.style?.map((s, i) => (
                  <span key={i} className="rounded-full bg-purple-50 px-3 py-1 text-xs text-[#6c5ce7]">{s}</span>
                ))}
              </div>
              <button
                onClick={reset}
                className="w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6]"
              >
                继续录入
              </button>
              <button onClick={onClose} className="mt-2 w-full rounded-xl py-3 text-sm text-zinc-500">
                完成
              </button>
            </div>
          ) : (
            /* Upload form */
            <div>
              {!preview ? (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mb-4 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-12 transition hover:border-[#6c5ce7]"
                >
                  <span className="text-3xl">📷</span>
                  <span className="text-sm text-zinc-600">点击拍照或选择图片</span>
                </button>
              ) : (
                <div className="relative mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="预览" className="w-full rounded-2xl object-contain" style={{ maxHeight: "40vh" }} />
                  <button
                    onClick={reset}
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow"
                  >
                    更换
                  </button>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              <input
                type="text"
                placeholder="补充描述（可选，如：去年买的通勤衬衫）"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="mb-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
              />

              {error && (
                <div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6] disabled:opacity-50"
              >
                {uploading ? "AI 识别中..." : "AI 识别并录入"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
