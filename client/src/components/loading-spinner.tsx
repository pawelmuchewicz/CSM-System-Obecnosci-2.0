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

  // Size configurations (w px dla consistency z twoim kodem)
  const sizeMap = {
    sm: 80,
    md: 120,
    lg: 160,
    xl: 200
  };

  const imgSize = sizeMap[size];

  const containerClass = fullScreen
    ? 'fixed inset-0 z-[99999] grid place-items-center bg-[#0b0b0c]'
    : 'flex items-center justify-center p-12';

  return (
    <div
      className={`${containerClass} transition-opacity duration-500 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <img
          src="https://roztanczonarumia.pl/wp-content/uploads/2025/10/ptaszek.png"
          alt="Ładowanie…"
          width={imgSize}
          height={imgSize}
          decoding="async"
          fetchPriority="high"
          className="mx-auto mb-4"
          style={{
            animation: 'spin 3s linear infinite',
            transformOrigin: '50% 50%',
            filter: 'drop-shadow(0 6px 18px rgba(0, 0, 0, 0.35))'
          }}
        />

        {text && (
          <p className="text-gray-400 font-medium text-sm">
            {text}
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
