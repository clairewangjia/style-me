export function LoadingState({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#6c5ce7]" />
      <div className="text-sm">{text}</div>
    </div>
  );
}
