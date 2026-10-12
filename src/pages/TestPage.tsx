import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { AttemptReviewRow, Question } from '../types/database'

type Answers = Record<string, string[]>
type CompletedAttempt = { attemptId: string; score: number }

function TestPage() {
  const { testId } = useParams<{ testId: string }>()
  const { profile } = useAuth()
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [error, setError] = useState<string | null>(null)
  const [completedAttempt, setCompletedAttempt] = useState<CompletedAttempt | null>(null)
  const [review, setReview] = useState<AttemptReviewRow[] | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    if (!supabase || !testId || !profile) return
    let cancelled = false

    async function load() {
      const { data: existing } = await supabase!
        .from('test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (cancelled) return

      if (existing) {
        setCompletedAttempt({ attemptId: existing.id, score: Number(existing.score) })
        return
      }

      const { data, error: rpcError } = await supabase!.rpc('get_test_questions', { p_test_id: testId })
      if (cancelled) return
      if (rpcError) {
        setError('No se ha podido cargar el examen.')
        return
      }
      setQuestions(data ?? [])
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [testId, profile])

  // Fetch the per-question review (right/wrong + correct options) once an
  // attempt exists, whether it was just submitted or already completed before.
  useEffect(() => {
    if (!supabase || !completedAttempt) return
    let cancelled = false

    supabase
      .rpc('get_attempt_review', { p_attempt_id: completedAttempt.attemptId })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          setReviewError('No se ha podido cargar la revision de respuestas.')
          return
        }
        setReview([...(data ?? [])].sort((a, b) => a.position - b.position))
      })

    return () => {
      cancelled = true
    }
  }, [completedAttempt])

  function toggleAnswer(question: Question, optionId: string) {
    setAnswers((prev) => {
      const current = prev[question.id] ?? []
      if (question.question_type === 'multiple_choice') {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        return { ...prev, [question.id]: next }
      }
      return { ...prev, [question.id]: [optionId] }
    })
  }

  const allAnswered = useMemo(
    () => (questions ?? []).every((question) => (answers[question.id]?.length ?? 0) > 0),
    [questions, answers],
  )

  async function handleSubmit() {
    if (!supabase || !testId || !questions) return
    setSubmitting(true)
    setError(null)
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
    const payload = questions.map((question) => ({
      question_id: question.id,
      selected_options: answers[question.id] ?? [],
    }))

    const { data, error: rpcError } = await supabase
      .rpc('submit_attempt', {
        p_test_id: testId,
        p_elapsed_seconds: elapsedSeconds,
        p_answers: payload,
      })
      .single<{ attempt_id: string; score: number }>()

    setSubmitting(false)
    if (rpcError || !data) {
      setError('No se ha podido enviar el examen. Puede que ya lo hayas completado.')
      return
    }
    setCompletedAttempt({ attemptId: data.attempt_id, score: Number(data.score) })
  }

  if (completedAttempt !== null) {
    return (
      <section className="result-panel">
        <p className="eyebrow">Examen completado</p>
        <h2>Resultado</h2>
        <p>Tu puntuacion: <strong>{completedAttempt.score}%</strong></p>
        <Link className="primary-button" to="/">Volver al panel</Link>

        {reviewError && <p className="auth-error">{reviewError}</p>}
        {!review && !reviewError && <p className="loading-state">Cargando revision de respuestas...</p>}
        {review && (
          <div className="review-list">
            {review.map((question, index) => (
              <article
                className={`question-card review-card ${question.is_correct ? 'review-correct' : 'review-incorrect'}`}
                key={question.question_id}
              >
                <p className="question-index">
                  Pregunta {index + 1} de {review.length} - {question.is_correct ? 'Correcta' : 'Incorrecta'}
                </p>
                <h3>{question.prompt}</h3>
                <div className="option-list">
                  {question.options.map((option) => {
                    const wasSelected = question.selected_options.includes(option.id)
                    const isCorrectOption = question.correct_options.includes(option.id)
                    const classes = [
                      'option-row',
                      'review-option',
                      isCorrectOption ? 'review-option-correct' : '',
                      wasSelected && !isCorrectOption ? 'review-option-wrong' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <div className={classes} key={option.id}>
                        <span>{option.label}</span>
                        {wasSelected && <span className="review-tag">Tu respuesta</span>}
                        {isCorrectOption && <span className="review-tag review-tag-correct">Correcta</span>}
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    )
  }

  if (error) return <p className="auth-error">{error}</p>
  if (!questions) return <p className="loading-state">Cargando examen...</p>

  return (
    <section className="test-runner">
      {questions.map((question, index) => (
        <article className="question-card" key={question.id}>
          <p className="question-index">Pregunta {index + 1} de {questions.length}</p>
          <h3>{question.prompt}</h3>
          <div className="option-list">
            {question.options.map((option) => {
              const selected = (answers[question.id] ?? []).includes(option.id)
              return (
                <label className={`option-row ${selected ? 'selected' : ''}`} key={option.id}>
                  <input
                    type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                    name={question.id}
                    checked={selected}
                    onChange={() => toggleAnswer(question, option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              )
            })}
          </div>
        </article>
      ))}

      <button
        className="primary-button"
        type="button"
        disabled={!allAnswered || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? 'Enviando...' : 'Entregar examen'}
      </button>
    </section>
  )
}

export default TestPage
