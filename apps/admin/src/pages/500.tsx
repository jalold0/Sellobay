export default function Custom500() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 16,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0 }}>500</h1>
      <p style={{ color: '#6b6b73', margin: 0 }}>Server xatosi yuz berdi</p>
      <a href="/" style={{ color: '#8B0020', textDecoration: 'underline' }}>
        Bosh sahifaga qaytish
      </a>
    </div>
  );
}
