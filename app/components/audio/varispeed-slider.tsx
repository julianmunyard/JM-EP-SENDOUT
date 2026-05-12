'use client'

import { useRef } from 'react'
import type { VarispeedMode } from '@/app/audio/engine/types'

interface VarispeedSliderProps {
  speed: number
  mode: VarispeedMode
  onSpeedChange: (speed: number) => void
  onModeChange: (mode: VarispeedMode) => void
  foregroundColor?: string
  elementBgColor?: string
  className?: string
}

export function VarispeedSlider({
  speed,
  mode,
  onSpeedChange,
  onModeChange,
  foregroundColor,
  elementBgColor,
  className = ''
}: VarispeedSliderProps) {
  const previousTick = useRef<number | null>(null)

  const activeColor = foregroundColor || '#000'
  const bgColor = elementBgColor || '#e5e7eb'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value)
    onSpeedChange(raw)

    const rounded = Math.round(raw * 10)
    if (previousTick.current === null) {
      previousTick.current = rounded
      return
    }

    if (rounded !== previousTick.current) {
      previousTick.current = rounded
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(5)
      }
    }
  }

  const handleModeToggle = () => {
    const newMode = mode === 'timestretch' ? 'natural' : 'timestretch'
    onModeChange(newMode)
  }

  const filledPercent = ((speed - 0.5) / (1.5 - 0.5)) * 100

  return (
    <div data-no-drag className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-sm" style={{ color: activeColor }}>
          {speed.toFixed(2)}x
        </span>
        <button
          onClick={handleModeToggle}
          className="px-2 py-0.5 font-mono border transition-colors text-xs rounded"
          style={{
            color: activeColor,
            borderColor: activeColor,
            backgroundColor: mode === 'natural' ? `${activeColor}20` : 'transparent'
          }}
        >
          {mode === 'timestretch' ? 'TIME-STRETCH' : 'NATURAL'}
        </button>
      </div>

      <div className="relative py-2">
        <div className="absolute top-0 left-0 right-0 flex justify-between pointer-events-none">
          {[0.5, 1.0, 1.5].map((tick) => {
            const position = ((tick - 0.5) / (1.5 - 0.5)) * 100
            return (
              <div
                key={tick}
                className="flex flex-col items-center"
                style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-0.5 h-2" style={{ backgroundColor: activeColor }} />
                <span className="text-[10px] font-mono mt-0.5" style={{ color: activeColor }}>
                  {tick}x
                </span>
              </div>
            )
          })}
        </div>

        <div className="relative pt-8">
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.01"
            value={speed}
            onChange={handleChange}
            className="w-full h-2 appearance-none cursor-pointer rounded-full vsr-input"
            style={{
              background: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${filledPercent}%, ${bgColor} ${filledPercent}%, ${bgColor} 100%)`,
              WebkitAppearance: 'none',
              outline: 'none',
              touchAction: 'none',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .vsr-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${activeColor};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .vsr-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${activeColor};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  )
}
