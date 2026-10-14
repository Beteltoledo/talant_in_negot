import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { categoryIsRealAge } from '../lib/age'
import type { AgeCategory, Test, TestAttempt } from '../types/database'

const CARD_COLORS = ['coral', 'teal', 'gold']
const DIFFICULTY_LABELS = { facil: 'Facil', medio: 'Medio', dificil: 'Dificil' } as const

function DashboardPage() {
  const { profile } = useAuth()
  const [categories, setCategories] = useState<AgeCategory[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !profile) return
    let cancelled = false

    async function load() {
      const [{ data: categoryRows }, { data: testRows }, { data: attemptRows }] = await Promise.all([
        supabase!.from('age_categories').select('*').order('min_age'),
        supabase!.from('tests').select('*').order('created_at'),
        supabase!.from('test_attempts').select('*').eq('user_id', profile!.id),
      ])
      if (cancelled) return
      setCategories(categoryRows ?? [])
      setTests(testRows ?? [])
      setAttempts(attemptRows ?? [])
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [profile])

  if (loading) return <p className="loading-state">Cargando...</p>

  return (
    <>
      <section className="section-heading">
        <div>
          <p className="eyebrow">Panel principal</p>
          <h2>Categorias de edad</h2>
        </div>
      </section>

      <section className="category-grid" aria-label="Categorias de edad">
        {categories.map((category, index) => {
          const isOwn = category.id === profile?.category_id
          const categoryTests = tests.filter((test) => test.category_id === category.id)

          return (
            <article className={`category-card ${CARD_COLORS[index % CARD_COLORS.length]}`} key={category.id}>
              <div className="card-topline">
                <span>{category.min_age} - {category.max_age}{categoryIsRealAge(category.min_age) ? ' años' : ''}</span>
                <span>{String(categoryTests.length).padStart(2, '0')}</span>
              </div>
              <h3>{category.name}</h3>
              {!isOwn && <p>No pertenece a tu categoria</p>}
              {isOwn && categoryTests.length === 0 && <p>Todavia no hay examenes publicados</p>}
              {isOwn && categoryTests.length > 0 && (
                <ul className="test-list">
                  {categoryTests.map((test) => {
                    const attempt = attempts.find((row) => row.test_id === test.id)
                    return (
                      <li key={test.id}>
                        <span>{test.title} ({DIFFICULTY_LABELS[test.difficulty]})</span>
                        {attempt ? (
                          <Link to={`/tests/${test.id}`} className="test-done">
                            Completado - {attempt.score}% (ver respuestas)
                          </Link>
                        ) : (
                          <Link to={`/tests/${test.id}`}>Abrir examen -&gt;</Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          )
        })}
      </section>
    </>
  )
}

export default DashboardPage
