export default function Custom404() {
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
      <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ color: '#6b6b73', margin: 0 }}>Sahifa topilmadi</p>
      <a href="/" style={{ color: '#8B0020', textDecoration: 'underline' }}>
        Bosh sahifaga qaytish
      </a>
    </div>
  );
}
