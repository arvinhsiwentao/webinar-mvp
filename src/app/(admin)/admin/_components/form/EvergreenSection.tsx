'use client';

interface EvergreenSectionProps {
  dailySchedule: string[];
  setDailySchedule: (v: string[]) => void;
  immediateSlotEnabled: boolean;
  setImmediateSlotEnabled: (v: boolean) => void;
  intervalMinutes: number;
  setIntervalMinutes: (v: number) => void;
  bufferMinutes: number;
  setBufferMinutes: (v: number) => void;
  maxWaitMinutes: number;
  setMaxWaitMinutes: (v: number) => void;
  displaySlotCount: number;
  setDisplaySlotCount: (v: number) => void;
  evergreenTimezone: string;
  setEvergreenTimezone: (v: string) => void;
}

export default function EvergreenSection({
  dailySchedule,
  setDailySchedule,
  immediateSlotEnabled,
  setImmediateSlotEnabled,
  intervalMinutes,
  setIntervalMinutes,
  bufferMinutes,
  setBufferMinutes,
  maxWaitMinutes,
  setMaxWaitMinutes,
  displaySlotCount,
  setDisplaySlotCount,
  evergreenTimezone,
  setEvergreenTimezone,
}: EvergreenSectionProps) {
  return (
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">自动循环排程 (Evergreen)</h2>

          <div className="space-y-6">
            {/* Daily anchor times */}
            <div>
              <label className="block text-sm text-neutral-500 mb-2">每日固定场次时间</label>
              <div className="space-y-2">
                {dailySchedule.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const updated = [...dailySchedule];
                        updated[idx] = e.target.value;
                        setDailySchedule(updated);
                      }}
                      className="bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
                    />
                    {dailySchedule.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDailySchedule(dailySchedule.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDailySchedule([...dailySchedule, '12:00'])}
                  className="text-[#B8953F] text-sm hover:text-[#A07A2F]"
                >
                  + 添加时间
                </button>
              </div>
            </div>

            {/* Immediate slot config */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-3">
                <input
                  type="checkbox"
                  checked={immediateSlotEnabled}
                  onChange={(e) => setImmediateSlotEnabled(e.target.checked)}
                  className="rounded accent-[#B8953F]"
                />
                启用即时场次
              </label>
              {immediateSlotEnabled && (
                <div className="grid grid-cols-3 gap-4 ml-6">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">间隔 (分钟)</label>
                    <select
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">缓冲 (分钟)</label>
                    <select
                      value={bufferMinutes}
                      onChange={(e) => setBufferMinutes(Number(e.target.value))}
                      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                    >
                      <option value={0}>0 (无缓冲)</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">触发阈值 (分钟)</label>
                    <input
                      type="number"
                      value={maxWaitMinutes}
                      onChange={(e) => setMaxWaitMinutes(Number(e.target.value))}
                      min={10}
                      max={120}
                      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* General settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">显示场次数</label>
                <input
                  type="number"
                  value={displaySlotCount}
                  onChange={(e) => setDisplaySlotCount(Number(e.target.value))}
                  min={2}
                  max={8}
                  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">时区</label>
                <select
                  value={evergreenTimezone}
                  onChange={(e) => setEvergreenTimezone(e.target.value)}
                  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                >
                  <option value="America/Chicago">CST (北美中部)</option>
                  <option value="America/New_York">EST (北美东部)</option>
                  <option value="America/Los_Angeles">PST (北美西部)</option>
                  <option value="Asia/Taipei">TST (台北)</option>
                </select>
              </div>
            </div>
          </div>
      </section>
  );
}
