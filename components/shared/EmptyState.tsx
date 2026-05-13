export function EmptyState({ icon = "📭", text = "暂无内容" }: { icon?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-zinc-400">
      <div className="text-4xl">{icon}</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}
