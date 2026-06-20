// frontend/src/components/QuestionsList.jsx

import { useState } from 'react';
import { useToast } from '../hooks/useToast';

export default function QuestionsList({ 
  questions, 
  type, 
  onDelete, 
  onClearAll,
  onRefresh,
  loading 
}) {
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      showToast('Вопрос удалён', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('Ошибка удаления', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`⚠️ Удалить все ${questions.length} вопросов ${type === 'qualification' ? 'отборочного тура' : 'финала'}?\nЭто действие нельзя отменить!`)) return;
    
    try {
      const res = await onClearAll();
      showToast(res.message || `Удалено ${questions.length} вопросов`, 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('Ошибка очистки', 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center" style={{ padding: '20px' }}>
        <div className="loading-spinner">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        color: 'rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
        <p>Нет вопросов</p>
        <p style={{ fontSize: '12px' }}>Загрузите вопросы через форму выше</p>
      </div>
    );
  }

  const isQualification = type === 'qualification';

  return (
    <div className="questions-list">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Всего вопросов: <strong>{questions.length}</strong>
        </span>
        <button
          onClick={handleClearAll}
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            padding: '6px 16px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: '0.2s'
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.25)'}
          onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.15)'}
        >
          🗑️ Очистить все
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '500px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {questions.map((q, index) => (
          <div
            key={q.id}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              transition: '0.2s'
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.03)'}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '4px'
              }}>
                <span style={{ 
                  color: 'rgba(255,255,255,0.4)', 
                  fontSize: '11px',
                  fontWeight: '600',
                  minWidth: '30px'
                }}>
                  #{index + 1}
                </span>
                
                {!isQualification && (
                  <>
                    <span style={{
                      background: 'rgba(240,197,100,0.15)',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#f0c564'
                    }}>
                      {q.category_name}
                    </span>
                    <span style={{
                      background: 'rgba(59,130,246,0.15)',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#4b8cff'
                    }}>
                      {q.value_points} баллов
                    </span>
                  </>
                )}
                
                {isQualification && (
                  <span style={{
                    background: 'rgba(16,185,129,0.15)',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#10b981'
                  }}>
                    Ответ: {q.correct_answer}
                  </span>
                )}
              </div>
              
              <div style={{ 
                color: 'rgba(255,255,255,0.85)', 
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                {q.question_text && q.question_text.length > 120 
                  ? q.question_text.substring(0, 120) + '...' 
                  : q.question_text}
              </div>
              
              {isQualification && (
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginTop: '4px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.3)',
                  flexWrap: 'wrap'
                }}>
                  <span>A) {q.option_a}</span>
                  <span>B) {q.option_b}</span>
                  <span>C) {q.option_c}</span>
                  <span>D) {q.option_d}</span>
                </div>
              )}
              
              {!isQualification && (
                <div style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.3)'
                }}>
                  Ответ: <span style={{ color: '#10b981' }}>{q.correct_answer}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => handleDelete(q.id)}
              disabled={deletingId === q.id}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: 'none',
                borderRadius: '6px',
                color: '#ef4444',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: '0.2s',
                opacity: deletingId === q.id ? 0.5 : 1,
                flexShrink: 0
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
            >
              {deletingId === q.id ? '🔄' : '✕'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}