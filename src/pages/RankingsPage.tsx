import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { CategoryRankingRow, GeneralRankingRow, Test, TestRankingRow } from '../types/database'

type Tab = 'test' | 'categoria' | 'general'

function RankingsPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('test')
  const [tests, setTests] = useState<Test[]>([])
  const [selectedTest, setSelectedTest] = useState('')
  const [testRanking, setTestRanking] = useState<TestRankingRow[]>([])
  const [categoryRanking, setCategoryRanking] = useState<CategoryRankingRow[]>([])
  const [generalRanking, setGeneralRanking] = useState<GeneralRankingRow[]>([])

  useEffect(() => {
    if (!supabase || !profile) return
    supabase
      .from('tests')
      .select('*')
      .eq('category_id', profile.category_id)
      .eq('difficulty', profile.difficulty)
      .order('created_at')
      .then(({ data }) => {
        setTests(data ?? [])
        setSelectedTest((current) => current || data?.[0]?.id || '')
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
    if (!supabase || !profile) return
    supabase
      .from('category_rankings')
      .select('*')
      .eq('category_id', profile.category_id)
      .eq('difficulty', profile.difficulty)
      .order('rank')
      .then(({ data }) => setCategoryRanking(data ?? []))
  }, [profile])

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
              <option key={test.id} value={test.id}>{test.title}</option>
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
            {categoryRanking.length === 0 && <p>Todavia no hay resultados en tu categoria.</p>}
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
