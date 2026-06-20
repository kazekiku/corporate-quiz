// frontend/src/components/FinalQuestionsManager.jsx

import { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import { 
  getFinalCategories,
  addFinalCategory,
  deleteFinalCategory,
  getFinalQuestionsByCategory,
  addFinalQuestion,
  deleteFinalQuestion,
  checkFinalReady
} from '../api/client';

const POINTS = [100, 200, 300, 400, 500];

export default function FinalQuestionsManager() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newQuestion, setNewQuestion] = useState({ text: '', answer: '', points: 100 });
  const [isReady, setIsReady] = useState(false);
  const [readyInfo, setReadyInfo] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const categoriesRes = await getFinalCategories();
      setCategories(categoriesRes.data.data || []);
      
      const readyRes = await checkFinalReady();
      setIsReady(readyRes.data.data.isReady);
      setReadyInfo(readyRes.data.data);
      
      if (categoriesRes.data.data?.length > 0) {
        const firstCategory = categoriesRes.data.data[0];
        setSelectedCategory(firstCategory);
        await loadQuestions(firstCategory.id);
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (categoryId) => {
    try {
      const res = await getFinalQuestionsByCategory(categoryId);
      setQuestions(res.data.data || []);
    } catch (err) {
      console.error('Ошибка загрузки вопросов:', err);
      showToast('Ошибка загрузки вопросов', 'error');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('Введите название категории', 'warning');
      return;
    }
    
    if (categories.length >= 3) {
      showToast('Максимум 3 категории', 'warning');
      return;
    }
    
    try {
      const res = await addFinalCategory(newCategoryName.trim());
      showToast('Категория добавлена!', 'success');
      setNewCategoryName('');
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Ошибка', 'error');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!confirm(`Удалить категорию "${name}" и все её вопросы?`)) return;
    
    try {
      await deleteFinalCategory(id);
      showToast('Категория удалена', 'success');
      await loadData();
    } catch (err) {
      showToast('Ошибка удаления', 'error');
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedCategory) {
      showToast('Выберите категорию', 'warning');
      return;
    }
    
    if (!newQuestion.text.trim() || !newQuestion.answer.trim()) {
      showToast('Заполните текст вопроса и ответ', 'warning');
      return;
    }
    
    if (questions.length >= 5) {
      showToast('В категории максимум 5 вопросов', 'warning');
      return;
    }
    
    try {
      await addFinalQuestion({
        category_id: selectedCategory.id,
        question_text: newQuestion.text.trim(),
        correct_answer: newQuestion.answer.trim(),
        value_points: newQuestion.points
      });
      
      showToast('Вопрос добавлен!', 'success');
      setNewQuestion({ text: '', answer: '', points: 100 });
      await loadQuestions(selectedCategory.id);
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Ошибка', 'error');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Удалить вопрос?')) return;
    
    try {
      await deleteFinalQuestion(id);
      showToast('Вопрос удалён', 'success');
      await loadQuestions(selectedCategory.id);
      await loadData();
    } catch (err) {
      showToast('Ошибка удаления', 'error');
    }
  };

  const handleSelectCategory = async (category) => {
    setSelectedCategory(category);
    await loadQuestions(category.id);
  };

  if (loading) {
    return (
      <div className="text-center" style={{ padding: '40px' }}>
        <div className="loading-spinner">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="final-questions-manager">
      {/* Статус готовности */}
      <div style={{
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '20px',
        background: isReady ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${isReady ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{isReady ? '✅' : '❌'}</span>
          <div>
            <div style={{ fontWeight: 'bold', color: isReady ? '#10b981' : '#ef4444' }}>
              {isReady ? 'Финал готов к запуску!' : 'Финал НЕ готов'}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              Категории: {readyInfo.categoriesCount || 0}/3 | 
              Вопросов: {readyInfo.questionsCount || 0}/15 | 
              Категорий с 5 вопросами: {readyInfo.categoriesWith5Questions || 0}/3
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Левая колонка - категории */}
        <div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
            📂 Категории ({categories.length}/3)
          </h3>
          
          {/* Добавление категории */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название категории"
              className="admin-input"
              style={{ flex: 1 }}
              disabled={categories.length >= 3}
            />
            <button
              onClick={handleAddCategory}
              className="btn btn-primary"
              disabled={categories.length >= 3}
            >
              Добавить
            </button>
          </div>

          {/* Список категорий */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map((cat) => {
              const isFull = cat.questions_count >= 5;
              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: selectedCategory?.id === cat.id 
                      ? 'rgba(59,130,246,0.2)' 
                      : 'rgba(255,255,255,0.05)',
                    border: selectedCategory?.id === cat.id 
                      ? '1px solid rgba(59,130,246,0.4)' 
                      : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: '0.2s'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: '500' }}>{cat.name}</span>
                    <span style={{ 
                      marginLeft: '12px', 
                      fontSize: '12px',
                      color: isFull ? '#10b981' : 'rgba(255,255,255,0.4)'
                    }}>
                      {cat.questions_count || 0}/5 вопросов
                      {isFull && ' ✅'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat.id, cat.name);
                    }}
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '4px',
                      color: '#ef4444',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {categories.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>
                Нет категорий. Добавьте первую!
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка - вопросы */}
        <div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
            ❓ Вопросы {selectedCategory ? `в "${selectedCategory.name}"` : ''} ({questions.length}/5)
          </h3>

          {selectedCategory && (
            <>
              {/* Добавление вопроса */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                marginBottom: '16px',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px'
              }}>
                <input
                  type="text"
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  placeholder="Текст вопроса"
                  className="admin-input"
                  disabled={questions.length >= 5}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newQuestion.answer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                    placeholder="Правильный ответ"
                    className="admin-input"
                    style={{ flex: 1 }}
                    disabled={questions.length >= 5}
                  />
                  <select
                    value={newQuestion.points}
                    onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })}
                    className="admin-input"
                    style={{ width: '100px' }}
                    disabled={questions.length >= 5}
                  >
                    {POINTS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddQuestion}
                    className="btn btn-primary"
                    disabled={questions.length >= 5}
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {/* Список вопросов */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {questions.sort((a, b) => a.value_points - b.value_points).map((q) => (
                  <div
                    key={q.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ 
                        color: '#f0c564', 
                        fontWeight: 'bold',
                        marginRight: '8px',
                        fontSize: '12px'
                      }}>
                        {q.value_points} баллов
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{q.question_text}</span>
                      <span style={{ 
                        color: 'rgba(255,255,255,0.4)', 
                        fontSize: '12px',
                        marginLeft: '8px'
                      }}>
                        → {q.correct_answer}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ef4444',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {questions.length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>
                    Нет вопросов. Добавьте первый!
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '12px', 
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)'
      }}>
        💡 Для запуска финала нужно: 3 категории, в каждой по 5 вопросов (всего 15 вопросов)
      </div>
    </div>
  );
}