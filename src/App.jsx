
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
function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function todayISO() { return toISO(new Date()) }
function mondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function weekDates(date) {
  const m = mondayOf(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(m)
    d.setDate(m.getDate() + i)
    return d
  })
}
function monthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}
function sameWeekday(aIso, bIso) {
  return fromISO(aIso).getDay() === fromISO(bIso).getDay()
}
function matchesOn(ev, dateIso) {
  if (ev.repeat_weekly) {
    return fromISO(dateIso) >= fromISO(ev.event_date) && sameWeekday(ev.event_date, dateIso)
  }
  return ev.event_date === dateIso
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)
  const [showCategoryEditor, setShowCategoryEditor] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#dbeafe')
  const [form, setForm] = useState({
    title: '',
    date: todayISO(),
    start_time: '09:00',
    end_time: '10:00',
    category_id: '',
    repeat_weekly: false,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  async function loadData() {
    setLoading(true)
    const userId = session.user.id

    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('id')

    if (!cats || cats.length === 0) {
      await supabase.from('categories').insert(
        defaultCategories.map(c => ({ user_id: userId, name: c.name, color: c.color }))
      )
    }

    const { data: freshCats } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('id')

    const { data: evs } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date')
      .order('start_time')

    setCategories(freshCats || [])
    setEvents(evs || [])
    setLoading(false)
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setMessage(error ? error.message : 'Belépési link elküldve emailben.')
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function saveEvent(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (form.end_time <= form.start_time) {
      setMessage('A záró idő legyen későbbi, mint a kezdő idő.')
      return
    }
    const payload = {
      user_id: session.user.id,
      title: form.title.trim(),
      event_date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      category_id: form.category_id || null,
      repeat_weekly: form.repeat_weekly,
    }
    if (editing) {
      await supabase.from('events').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('events').insert(payload)
    }
    setForm({
      title: '',
      date: selectedDate,
      start_time: '09:00',
      end_time: '10:00',
      category_id: categories[0]?.id || '',
      repeat_weekly: false,
    })
    setEditing(null)
    setMessage('')
    await loadData()
  }

  function startNewEvent() {
    setEditing(null)
    setForm({
      title: '',
      date: selectedDate,
      start_time: '09:00',
      end_time: '10:00',
      category_id: categories[0]?.id || '',
      repeat_weekly: false,
    })
  }

  function editEvent(ev) {
    setEditing(ev)
    setForm({
      title: ev.title,
      date: ev.event_date,
      start_time: ev.start_time.slice(0,5),
      end_time: ev.end_time.slice(0,5),
      category_id: ev.category_id || '',
      repeat_weekly: ev.repeat_weekly,
    })
  }

  async function deleteEvent(id) {
    await supabase.from('events').delete().eq('id', id)
    await loadData()
  }

  async function addCategory(e) {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    await supabase.from('categories').insert({
      user_id: session.user.id,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    })
    setNewCategoryName('')
    setNewCategoryColor('#dbeafe')
    await loadData()
  }

  async function deleteCategory(id) {
    await supabase.from('categories').delete().eq('id', id)
    if (form.category_id === id) {
      setForm({ ...form, category_id: '' })
    }
    await loadData()
  }

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase()
    return events.filter(ev => {
      const cat = categories.find(c => c.id === ev.category_id)?.name || ''
      return `${ev.title} ${ev.event_date} ${ev.start_time} ${ev.end_time} ${cat}`.toLowerCase().includes(q)
    })
  }, [events, categories, search])

  function eventsOn(dateIso) {
    return filteredEvents.filter(ev => matchesOn(ev, dateIso))
      .sort((a,b) => `${a.event_date} ${a.start_time}`.localeCompare(`${b.event_date} ${b.start_time}`))
  }

  const week = weekDates(currentDate)
  const month = monthGrid(currentDate)
  const selectedEvents = eventsOn(selectedDate)
  const dayNames = ['Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap']
  const shortNames = ['H','K','Sze','Cs','P','Szo','V']
  const monthNames = ['Január','Február','Március','Április','Május','Június','Július','Augusztus','Szeptember','Október','November','December']

  function shift(dir) {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  function catStyle(id) {
    const cat = categories.find(c => c.id === id)
    return { background: cat?.color || '#e5e7eb' }
  }

  if (loading) return <div className="center">Betöltés...</div>

  if (!session) {
    return (
      <div className="center">
        <div className="login-card">
          <h1>Viki naptár</h1>
          <p>Emailes belépés után ugyanazt látod majd gépen és telefonon is.</p>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email címed" />
          <button onClick={signIn}>Belépési link küldése</button>
          <div className="msg">{message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Viki naptár</h1>
          <div className="sub">Fehér napok, színkódos kategóriák, heti ismétlődés, telefonos szinkron.</div>
        </div>
        <div className="row gap">
          <button className={view === 'week' ? 'dark' : ''} onClick={() => setView('week')}>Heti nézet</button>
          <button className={view === 'month' ? 'dark' : ''} onClick={() => setView('month')}>Havi nézet</button>
          <button onClick={signOut}>Kilépés</button>
        </div>
      </div>

      <div className="layout">
        <div className="panel">
          <div className="toolbar">
            <div className="row gap">
              <button onClick={() => shift(-1)}>◀</button>
              <strong>{view === 'week' ? `${toISO(week[0])} – ${toISO(week[6])}` : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}</strong>
              <button onClick={() => shift(1)}>▶</button>
            </div>
            <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés..." />
          </div>

          {view === 'week' ? (
            <div className="grid7">
              {week.map((d, i) => {
                const iso = toISO(d)
                const dayEvents = eventsOn(iso)
                return (
                  <div key={iso} className={`day ${selectedDate === iso ? 'selected' : ''}`} onClick={() => setSelectedDate(iso)}>
                    <div className="dayhead">{dayNames[i]}<br />{iso}</div>
                    {dayEvents.length === 0 ? <div className="muted">Nincs esemény</div> :
                      dayEvents.map(ev => (
                        <div className="event" style={catStyle(ev.category_id)} key={`${ev.id}-${iso}`}>
                          <div><strong>{ev.start_time.slice(0,5)}–{ev.end_time.slice(0,5)}</strong></div>
                          <div>{ev.title}{ev.repeat_weekly ? ' 🔁' : ''}</div>
                        </div>
                      ))
                    }
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className="grid7 titles">{shortNames.map(d => <div key={d}>{d}</div>)}</div>
              <div className="grid7">
                {month.map((d) => {
                  const iso = toISO(d)
                  const inMonth = d.getMonth() === currentDate.getMonth()
                  return (
                    <div key={iso} className={`day monthday ${selectedDate === iso ? 'selected' : ''} ${inMonth ? '' : 'dim'}`} onClick={() => setSelectedDate(iso)}>
                      <div className="dayhead">{d.getDate()}</div>
                      {eventsOn(iso).slice(0,3).map(ev => (
                        <div className="event small" style={catStyle(ev.category_id)} key={`${ev.id}-${iso}`}>
                          {ev.start_time.slice(0,5)} {ev.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="side">
          <div className="panel">
            <div className="row spread">
              <h3>{editing ? 'Esemény szerkesztése' : 'Új esemény'}</h3>
              <button onClick={startNewEvent}>Új</button>
            </div>
            <form onSubmit={saveEvent} className="form">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Esemény címe" />
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              <div className="row gap">
                <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Válassz kategóriát</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label className="check"><input type="checkbox" checked={form.repeat_weekly} onChange={e => setForm({ ...form, repeat_weekly: e.target.checked })} /> Hetente ismétlődik</label>
              <button className="dark" type="submit">{editing ? 'Mentés' : 'Hozzáadás'}</button>
            </form>
            {message && <div className="msg">{message}</div>}
          </div>

          <div className="panel">
            <div className="row spread">
              <h3>Kategóriák</h3>
              <button onClick={() => setShowCategoryEditor(!showCategoryEditor)}>{showCategoryEditor ? 'Bezár' : 'Szerkesztés'}</button>
            </div>
            {categories.map(c => (
              <div key={c.id} className="catrow">
                <div className="catbadge" style={{ background: c.color }}></div>
                <div>{c.name}</div>
                {showCategoryEditor && <button onClick={() => deleteCategory(c.id)}>Törlés</button>}
              </div>
            ))}
            {showCategoryEditor && (
              <form onSubmit={addCategory} className="form topgap">
                <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Új kategória neve" />
                <input type="color" value={newCategoryColor} onChange={e => setNewCategoryColor(e.target.value)} />
                <button type="submit">Kategória hozzáadása</button>
              </form>
            )}
          </div>

          <div className="panel">
            <h3>Kiválasztott nap</h3>
            <div className="sub">{selectedDate}</div>
            {selectedEvents.length === 0 ? <div className="muted">Nincs esemény</div> :
              selectedEvents.map(ev => {
                const cat = categories.find(c => c.id === ev.category_id)
                return (
                  <div className="selected-event" style={catStyle(ev.category_id)} key={`${ev.id}-${selectedDate}`}>
                    <div><strong>{ev.title}</strong></div>
                    <div>{ev.start_time.slice(0,5)} – {ev.end_time.slice(0,5)}</div>
                    <div>{cat?.name || 'Nincs kategória'}{ev.repeat_weekly ? ' • hetente ismétlődik' : ''}</div>
                    <div className="row gap topgap">
                      <button onClick={() => editEvent(ev)}>Szerkesztés</button>
                      <button onClick={() => deleteEvent(ev.id)}>Törlés</button>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}
