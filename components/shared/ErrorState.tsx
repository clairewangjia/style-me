export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="text-3xl">😵</div>
      <div className="text-sm text-red-600">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl bg-[#6c5ce7] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4bd6]"
        >
          重试
        </button>
      )}
    </div>
  );
}
