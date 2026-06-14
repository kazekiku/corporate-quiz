// components/LoadingSpinner.jsx
export default function LoadingSpinner({ text = 'Загрузка...' }) {
  return (
    <div className="auth-layout">
      <div className="container-narrow">
        <div className="card text-center">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
            <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
            <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
          </div>
          <p>{text}</p>
        </div>
      </div>
    </div>
  );
}