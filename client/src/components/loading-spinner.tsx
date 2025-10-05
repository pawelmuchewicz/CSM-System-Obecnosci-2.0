import { useEffect, useState } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  text = 'Ładowanie...',
  fullScreen = false
}: LoadingSpinnerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Size configurations
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100'
    : 'flex items-center justify-center p-12';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div
          className={`${sizeClasses[size]} mx-auto mb-4 transition-opacity duration-500 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            animation: 'spin 3s linear infinite, pulse 2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 20px rgba(220, 38, 127, 0.4))'
          }}
        >
          <svg
            viewBox="0 0 700 700"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <animate
                  attributeName="x1"
                  values="0%;100%;0%"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="y1"
                  values="0%;100%;0%"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <stop offset="0%" style={{ stopColor: '#dc267f', stopOpacity: 1 }}>
                  <animate
                    attributeName="stop-color"
                    values="#dc267f;#ff5a9d;#dc267f"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" style={{ stopColor: '#b91c5e', stopOpacity: 1 }}>
                  <animate
                    attributeName="stop-color"
                    values="#b91c5e;#dc267f;#b91c5e"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
            </defs>
            <g fill="url(#logoGradient)">
              {/* Left dancer figure */}
              <path d="M 220 30 Q 280 20 320 50 Q 340 80 310 120 Q 280 140 250 130 L 240 200 Q 230 250 200 300 L 180 350 Q 160 400 120 450 Q 80 480 50 490 Q 60 460 80 430 Q 120 380 140 350 L 160 300 Q 180 260 190 220 L 200 150 Q 210 100 220 80 Z" />

              {/* Left dancer head */}
              <ellipse cx="280" cy="90" rx="30" ry="35" />

              {/* Right dancer figure */}
              <path d="M 400 220 Q 420 200 450 210 Q 470 220 480 250 L 500 300 Q 520 350 560 400 L 600 450 Q 640 500 680 540 Q 660 560 630 540 Q 590 510 560 480 L 520 430 Q 480 380 460 340 L 440 290 Q 430 260 420 250 Z" />

              {/* Right dancer head */}
              <ellipse cx="410" cy="235" rx="28" ry="32" />

              {/* Central dancer figure */}
              <path d="M 340 300 Q 360 280 390 290 Q 410 300 420 330 L 430 380 Q 440 430 460 480 L 480 530 Q 500 580 520 620 Q 540 650 560 670 Q 540 680 520 670 Q 480 650 460 630 L 440 590 Q 420 550 410 510 L 400 460 Q 390 410 380 370 L 370 330 Q 360 310 350 305 Z" />

              {/* Central dancer head */}
              <ellipse cx="365" cy="320" rx="26" ry="30" />

              {/* Additional flow lines for movement effect */}
              <path d="M 180 200 Q 150 180 120 200" opacity="0.6" strokeWidth="8" stroke="url(#logoGradient)" fill="none" />
              <path d="M 550 350 Q 590 330 630 350" opacity="0.6" strokeWidth="8" stroke="url(#logoGradient)" fill="none" />
            </g>
          </svg>
        </div>

        {text && (
          <p
            className={`text-gray-600 font-medium transition-opacity duration-700 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            {text}
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(90deg) scale(1.05); }
          50% { transform: rotate(180deg) scale(1); }
          75% { transform: rotate(270deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}
