import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { calculateAge, categoryIsRealAge, difficultyForMinAge } from '../lib/age'
import { useAuth } from '../context/AuthContext'
import type { AgeCategory } from '../types/database'

function SignUpPage() {
  const { session, signUp } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<AgeCategory[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('age_categories')
      .select('*')
      .order('min_age')
      .then(({ data }) => {
        setCategories(data ?? [])
        setCategoryId((current) => current || data?.[0]?.id || '')
      })
  }, [])

  const ageWarning = useMemo(() => {
    if (!birthDate || !categoryId) return null
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return null
    // 2-3, 4-5, 6-7, 8-9 and 10-11 are class/grade groupings, not real age
    // ranges, so comparing the declared birth date against them is meaningless;
    // only warn for the real age categories (18-35, +35).
    if (!categoryIsRealAge(category.min_age)) return null
    const age = calculateAge(birthDate)
    if (age < category.min_age || age > category.max_age) {
      return `Aviso: la edad introducida (${age} años) no coincide con el rango habitual de "${category.name}" (${category.min_age}-${category.max_age} años). Puedes continuar igualmente.`
    }
    return null
  }, [birthDate, categoryId, categories])

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !birthDate || !categoryId || !username.trim()) {
      setError('Rellena todos los campos.')
      return
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    const category = categories.find((c) => c.id === categoryId)
    if (!category) {
      setError('Selecciona una categoria valida.')
      return
    }
    const difficulty = difficultyForMinAge(category.min_age)

    setSubmitting(true)
    const message = await signUp({ firstName, lastName, birthDate, username, password, categoryId, difficulty })
    setSubmitting(false)
    if (message) {
      setError(message)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <main className="shell auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Examenes</p>
        <h1>Crear cuenta</h1>
        {!isSupabaseConfigured && (
          <p className="auth-warning">
            Supabase no esta configurado todavia (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
          </p>
        )}
        <label>
          Nombre
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        </label>
        <label>
          Apellido
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        </label>
        <label>
          Fecha de nacimiento
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            required
          />
        </label>
        <label>
          Categoria
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.min_age}-{category.max_age}{categoryIsRealAge(category.min_age) ? ' años' : ''})
              </option>
            ))}
          </select>
        </label>
        {ageWarning && <p className="auth-warning">{ageWarning}</p>}
        <label>
          Usuario
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          Repetir contrasena
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={submitting || !isSupabaseConfigured}>
          {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <p className="auth-footnote">
          Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </form>
    </main>
  )
}

export default SignUpPage
