import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#BE4BDB',
          color: 'white',
          fontSize: 280,
          fontWeight: 700,
          letterSpacing: -14,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        ko
      </div>
    ),
    { ...size },
  );
}
