import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Stay Singletrack - Colorado Trail Conditions';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1511',
          backgroundImage: 'linear-gradient(135deg, #1a1511 0%, #2d241e 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 700,
            color: '#f5f1ed',
            marginBottom: 16,
            fontFamily: 'system-ui',
          }}
        >
          Stay Singletrack
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#22c55e',
            fontFamily: 'system-ui',
          }}
        >
          AI-Powered Trail Conditions for Colorado
        </div>
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 48,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#d4cdc5',
              fontSize: 20,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#22c55e',
              }}
            />
            6,000+ Trails
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#d4cdc5',
              fontSize: 20,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#22c55e',
              }}
            />
            Updated Daily
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
