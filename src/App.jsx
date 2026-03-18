import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const defaultCategories = [
  { name: 'Kötelező', color: '#fecaca' },
  { name: 'Szépítkezés', color: '#fbcfe8' },
  { name: 'Szupervízió', color: '#ddd6fe' },
  { name: 'Külső munka', color: '#bfdbfe' },
  { name: 'ABA', color: '#a5f3fc' },
  { name: 'Admin', color: '#fed7aa' },
  { name: 'Magán', color: '#bbf7d0' },
  { name: 'Család', color: '#fde68a' },
]

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekRange(baseDate) {
  const date = new Date(baseDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  return days
}

function App() {
  const [weekStart, setWeekStart] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newItem, setNewItem] = useState({
    title: '',
    category: 'Kötelező',
    date: toISO(new Date()),
    start_time: '09:00',
    end_time: '10:00',
  })

  const days = useMemo(() => weekRange(weekStart), [weekStart])

  async function loadEvents() {
    setLoading(true)
    setError('')

    const from = toISO(days[0])
    const to = toISO(days[6])

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      setError('Hiba az adatok betöltésénél: ' + error.message)
      setEvents([])
    } else {
      setEvents(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadEvents()
  }, [weekStart])

  async function addEvent(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('events').insert([newItem])

    if (error) {
      setError('Hiba mentéskor: ' + error.message)
    } else {
      setNewItem({
        title: '',
        category: 'Kötelező',
        date: toISO(new Date()),
        start_time: '09:00',
        end_time: '10:00',
      })
      await loadEvents()
    }

    setSaving(false)
  }

  async function deleteEvent(id) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) {
      setError('Hiba törléskor: ' + error.message)
    } else {
      await loadEvents()
    }
  }

  function previousWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  function currentWeek() {
    setWeekStart(new Date())
  }

  function eventsForDay(date) {
    const iso = toISO(date)
    return events.filter((e) => e.date === iso)
  }

  function categoryColor(categoryName) {
    return (
      defaultCategories.find((c) => c.name === categoryName)?.color || '#e5e7eb'
    )
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '10px' }}>Viki naptár</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={previousWeek}>Előző hét</button>
        <button onClick={currentWeek}>Mai hét</button>
        <button onClick={nextWeek}>Következő hét</button>
      </div>

      <form
        onSubmit={addEvent}
        style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <h2>Új esemény</h2>

        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input
            placeholder="Esemény neve"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            required
          />

          <select
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
          >
            {defaultCategories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={newItem.date}
            onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
            required
          />

          <input
            type="time"
            value={newItem.start_time}
            onChange={(e) => setNewItem({ ...newItem, start_time: e.target.value })}
            required
          />

          <input
            type="time"
            value={newItem.end_time}
            onChange={(e) => setNewItem({ ...newItem, end_time: e.target.value })}
            required
          />
        </div>

        <button type="submit" disabled={saving} style={{ marginTop: '12px' }}>
          {saving ? 'Mentés...' : 'Esemény mentése'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'darkred', marginBottom: '16px', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Betöltés...</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '12px',
          }}
        >
          {days.map((day) => (
            <div
              key={day.toISOString()}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '12px',
                minHeight: '220px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {day.toLocaleDateString('hu-HU', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </h3>

              {eventsForDay(day).length === 0 ? (
                <p style={{ color: '#666' }}>Nincs esemény</p>
              ) : (
                eventsForDay(day).map((event) => (
                  <div
                    key={event.id}
                    style={{
                      background: categoryColor(event.category),
                      padding: '10px',
                      borderRadius: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <strong>{event.title}</strong>
                    <div>{event.category}</div>
                    <div>
                      {event.start_time} - {event.end_time}
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      style={{ marginTop: '8px' }}
                    >
                      Törlés
                    </button>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
