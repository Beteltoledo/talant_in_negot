import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { difficultyForMinAge } from '../lib/age'
import type { AgeCategory, CategoryRankingRow, GeneralRankingRow, RankableTest, TestRankingRow } from '../types/database'

type Tab = 'test' | 'categoria' | 'general'

function RankingsPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('test')
  const [tests, setTests] = useState<RankableTest[]>([])
  const [selectedTest, setSelectedTest] = useState('')
  const [testRanking, setTestRanking] = useState<TestRankingRow[]>([])
  const [categories, setCategories] = useState<AgeCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryRanking, setCategoryRanking] = useState<CategoryRankingRow[]>([])
  const [generalRanking, setGeneralRanking] = useState<GeneralRankingRow[]>([])

  // "Por test" and "Acumulada por categoria" let a participant browse every
  // class, not just their own: test-taking access stays restricted by RLS,
  // but results/rankings across classes are not sensitive.
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('rankable_tests')
      .select('*')
      .order('category_name')
      .then(({ data }) => {
        setTests(data ?? [])
        setSelectedTest((current) => {
          if (current) return current
          const ownTest = data?.find((t) => t.category_id === profile?.category_id)
          return ownTest?.id ?? data?.[0]?.id ?? ''
        })
      })
  }, [profile])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('age_categories')
      .select('*')
      .order('min_age')
      .then(({ data }) => {
        setCategories(data ?? [])
        setSelectedCategoryId((current) => current || profile?.category_id || data?.[0]?.id || '')
      })
  }, [profile])

  useEffect(() => {
    if (!supabase || !selectedTest) return
    supabase
      .from('test_rankings')
      .select('*')
      .eq('test_id', selectedTest)
      .order('rank')
      .then(({ data }) => setTestRanking(data ?? []))
  }, [selectedTest])

  useEffect(() => {
    if (!supabase || !selectedCategoryId) return
    const category = categories.find((c) => c.id === selectedCategoryId)
    if (!category) return
    supabase
      .from('category_rankings')
      .select('*')
      .eq('category_id', selectedCategoryId)
      .eq('difficulty', difficultyForMinAge(category.min_age))
      .order('rank')
      .then(({ data }) => setCategoryRanking(data ?? []))
  }, [selectedCategoryId, categories])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('general_rankings')
      .select('*')
      .order('rank')
      .then(({ data }) => setGeneralRanking(data ?? []))
  }, [])

  return (
    <>
      <section className="section-heading">
        <div>
          <p className="eyebrow">Clasificaciones</p>
          <h2>Resultados</h2>
        </div>
      </section>

      <div className="nav-tabs rankings-tabs">
        <button className={tab === 'test' ? 'active' : ''} type="button" onClick={() => setTab('test')}>
          Por test
        </button>
        <button className={tab === 'categoria' ? 'active' : ''} type="button" onClick={() => setTab('categoria')}>
          Acumulada por categoria
        </button>
        <button className={tab === 'general' ? 'active' : ''} type="button" onClick={() => setTab('general')}>
          General
        </button>
      </div>

      {tab === 'test' && (
        <article className="ranking-panel">
          <select value={selectedTest} onChange={(event) => setSelectedTest(event.target.value)}>
            {tests.map((test) => (
              <option key={test.id} value={test.id}>{test.category_name} - {test.title}</option>
            ))}
          </select>
          <div className="ranking-list">
            {testRanking.map((row) => (
              <div className="ranking-row" key={row.user_id}>
                <span className="position">{String(row.rank).padStart(2, '0')}</span>
                <span className="rank-name"><strong>{row.display_name}</strong></span>
                <strong className="score">{row.score}%</strong>
              </div>
            ))}
            {testRanking.length === 0 && <p>Todavia no hay resultados para este test.</p>}
          </div>
        </article>
      )}

      {tab === 'categoria' && (
        <article className="ranking-panel">
          <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <div className="ranking-list">
            {categoryRanking.map((row) => (
              <div className="ranking-row" key={row.user_id}>
                <span className="position">{String(row.rank).padStart(2, '0')}</span>
                <span className="rank-name">
                  <strong>{row.display_name}</strong>
                  <small>{row.attempts_count} examenes</small>
                </span>
                <strong className="score">{row.total_score}</strong>
              </div>
            ))}
            {categoryRanking.length === 0 && <p>Todavia no hay resultados en esta categoria.</p>}
          </div>
        </article>
      )}

      {tab === 'general' && (
        <article className="ranking-panel">
          <div className="ranking-list">
            {generalRanking.map((row) => (
              <div className="ranking-row" key={row.user_id}>
                <span className="position">{String(row.rank).padStart(2, '0')}</span>
                <span className="rank-name">
                  <strong>{row.display_name}</strong>
                  <small>{row.category_name}</small>
                </span>
                <strong className="score">{row.total_score}</strong>
              </div>
            ))}
            {generalRanking.length === 0 && <p>Todavia no hay resultados generales.</p>}
          </div>
        </article>
      )}
    </>
  )
}

export default RankingsPage

