import { useEffect, useRef, useState } from "react";

const BARS = [
  { time: "1 min", target: 391, width: 100, active: true },
  { time: "1,5 min", target: 160, width: 41, active: false },
  { time: "5,30 min", target: 100, width: 25, active: false },
  { time: "30 min", target: 36, width: 12, active: false },
];

const DURATION = 1800;

export default function ConversionBars() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      // easeOutCubic
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  return (
    <div ref={ref} className="mt-24 mx-auto max-w-4xl" id="conversion-chart">
      <p className="mb-8 text-xs font-bold uppercase tracking-widest text-slate-400">
        Conversão por tempo de resposta
      </p>
      <div className="space-y-4">
        {BARS.map((bar) => (
          <div key={bar.time} className="flex items-center gap-4">
            <span className="w-20 text-right text-sm font-bold text-slate-500">{bar.time}</span>
            <div className="relative h-10 flex-1 overflow-hidden rounded-full bg-slate-50 group/bar">
              <div
                className={`absolute inset-y-0 left-0 flex items-center justify-end rounded-full pr-4 ${
                  bar.active
                    ? "bg-gradient-to-r from-[#004DFF] to-[#4A86FF] shadow-[0_0_15px_rgba(0,77,255,0.3)]"
                    : "bg-slate-200"
                }`}
                style={{ width: `${Math.max(bar.width * progress, 8)}%` }}
              >
                <div className="absolute inset-0 -translate-x-full rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 ease-in-out group-hover/bar:translate-x-full" />
                <span
                  className={`relative z-10 text-xs font-bold tabular-nums ${
                    bar.active ? "text-white" : "text-slate-600"
                  }`}
                >
                  {Math.round(bar.target * progress)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
