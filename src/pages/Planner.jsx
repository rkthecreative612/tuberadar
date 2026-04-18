import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import supabase from '../lib/supabase'
import InlineScheduler from '../components/InlineScheduler'

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const scrollbarStyles = `
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const COLORS = {
  // Background colors
  bgMain: '#0f0f0f',
  bgCard: '#1a1a1a',
  bgInput: '#1a1a1a',
  bgModal: '#101010',
  bgHover: '#2a2a2a',

  // Text colors
  textPrimary: '#fff',
  textSecondary: '#888',
  textTertiary: '#ccc',
  textError: '#ef4444',
  textSuccess: '#22c55e',

  // Border colors
  borderDefault: '#333',
  borderLight: '#222',

  // Button colors
  buttonBgPrimary: '#fff',
  buttonTextPrimary: '#000',
  buttonBgSecondary: '#1a1a1a',
  buttonTextSecondary: '#fff',
  buttonBgDanger: '#ef4444',
  buttonBgSuccess: '#22c55e',

  // Status colors
  success: '#4caf50',
  error: '#ef4444',
  warning: '#ff9800',
}

function Planner() {
  const navigate = useNavigate()

  const autoExpandTextarea = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px'
  }
  const [topics, setTopics] = useState([])
  const [byTopic, setByTopic] = useState({})
  const [expandedCardId, setExpandedCardId] = useState(null)
  const [viewModal, setViewModal] = useState({ open: false, topicId: null, video: null })
  const [addModal, setAddModal] = useState({ open: false, topic: null })
  const [addForm, setAddForm] = useState({
    title: '',
    videoLink: '',
    description: '',
    notes: '',
    bindedLinks: [''],
  })
  const [addErrors, setAddErrors] = useState({ title: '', description: '' })
  const [savingById, setSavingById] = useState({})
  const [saveErrorById, setSaveErrorById] = useState({})
  const [deleteModal, setDeleteModal] = useState({ open: false, topicId: null, cardId: null })
  const [schedulingCardId, setSchedulingCardId] = useState(null)
  const [toast, setToast] = useState(null) // { text, kind }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function extractYouTubeId(url) {
    const raw = String(url || '').trim()
    if (!raw) return null
    try {
      const u = new URL(raw)
      if (u.hostname === 'youtu.be') return u.pathname.replace('/', '') || null
      if (u.hostname.endsWith('youtube.com')) return u.searchParams.get('v')
      return null
    } catch {
      // Fallback for plain IDs pasted in.
      if (/^[a-zA-Z0-9_-]{8,20}$/.test(raw)) return raw
      return null
    }
  }

  function openAddModal(topic) {
    setAddModal({ open: true, topic })
    setAddForm({ title: '', videoLink: '', description: '', notes: '', bindedLinks: [''] })
    setAddErrors({ title: '', description: '' })
  }

  function closeAddModal() {
    setAddModal({ open: false, topic: null })
    setAddForm({ title: '', videoLink: '', description: '', notes: '', bindedLinks: [''] })
    setAddErrors({ title: '', description: '' })
  }

  async function addPlannerVideo() {
    const title = addForm.title.trim()
    const description = addForm.description.trim()

    const next = {
      title: title ? '' : 'Title is required',
      description: description ? '' : 'Description is required',
    }
    setAddErrors(next)
    if (next.title || next.description) return

    const topic = addModal.topic
    if (!topic?.id) return

    const { data: lastRow } = await supabase
      .from('planner_videos')
      .select('position')
      .eq('topic_id', topic.id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (lastRow?.position ?? 0) + 1

    const binded = (addForm.bindedLinks || [])
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .map((link) => {
        const id = extractYouTubeId(link)
        return {
          video_id: id,
          video_link: id ? `https://www.youtube.com/watch?v=${id}` : link,
          thumbnail: id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '',
        }
      })

    const payload = {
      topic_id: topic.id,
      status: 'planning',
      video_title: title,
      video_description: description,
      binded_videos: binded,
      notes: addForm.notes.trim(),
      position: nextPosition,
    }

    const { data, error } = await supabase.from('planner_videos').insert(payload).select('*').single()
    if (error) {
      console.log(error)
      alert('Failed to add video: ' + error.message)
      return
    }

    setByTopic((prev) => ({
      ...prev,
      [topic.id]: [...(prev[topic.id] || []), data],
    }))

    closeAddModal()
    alert('✅ Video added to Planner')
  }

  useEffect(() => {
    let alive = true

    async function load() {
      const { data: topicRows, error: topicErr } = await supabase
        .from('my_channels')
        .select('*')
        .order('created_at', { ascending: false })

      if (!alive) return
      if (topicErr) {
        console.log(topicErr)
        return
      }

      const list = topicRows || []
      setTopics(list)

      const results = await Promise.all(
        list.map(async (t) => {
          const { data } = await supabase
            .from('planner_videos')
            .select('*')
            .eq('topic_id', t.id)
            .order('position', { ascending: true })
            .order('created_at', { ascending: true })
          
          const normalized = (data || []).map(video => ({
            ...video,
            created_at: video.created_at && !video.created_at.includes('Z') 
              ? `${video.created_at}Z` 
              : video.created_at
          }));

          return [t.id, normalized]
        }),
      )

      if (!alive) return
      const map = {}
      for (const [topicId, rows] of results) map[topicId] = rows
      setByTopic(map)
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  const topicRows = useMemo(() => chunk(topics, 3), [topics])

  const pageStyle = {
    height: '100%',
    overflowY: 'auto',
    backgroundColor: COLORS.bgMain,
    padding: '22px',
    boxSizing: 'border-box',
    color: COLORS.textPrimary,
    fontFamily: 'system-ui, sans-serif',
  }

  const gridStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  }

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '20px',
  }

  const colStyle = {
    backgroundColor: COLORS.bgMain,
    border: `1px solid ${COLORS.borderDefault}`,
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '160px',
    display: 'flex',
    flexDirection: 'column',
  }

  const colHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 12px',
    borderBottom: `1px solid ${COLORS.borderDefault}`,
    backgroundColor: COLORS.bgMain,
  }

  const colTitleStyle = {
    margin: 0,
    fontSize: '13px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const colAddStyle = {
    marginLeft: 'auto',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.borderDefault}`,
    backgroundColor: COLORS.textPrimary,
    color: COLORS.buttonTextPrimary,
    cursor: 'pointer',
    fontWeight: 900,
  }

  const colBodyStyle = {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }

  const cardStyle = {
    backgroundColor: COLORS.bgCard,
    border: `1px solid ${COLORS.borderDefault}`,
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
  }

  const thumbStyle = {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    backgroundColor: COLORS.bgMain,
  }

  const cardBodyStyle = {
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }

  const h3Style = { margin: 0, fontSize: '13px', fontWeight: 800, lineHeight: 1.2 }

  const fieldLabelStyle = { fontSize: '11px', color: '#9a9a9a', marginBottom: '6px' }

  const inputStyle = {
    width: '100%',
    padding: '9px 10px',
    borderRadius: '10px',
    border: `1px solid ${COLORS.borderDefault}`,
    backgroundColor: COLORS.bgMain,
    color: COLORS.textPrimary,
    outline: 'none',
    boxSizing: 'border-box',
    fontSize: '12px',
  }

  const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '68px' }

  const bindRowStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap' }

  const bindThumbStyle = {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.borderDefault}`,
    objectFit: 'cover',
    cursor: 'pointer',
    backgroundColor: COLORS.bgModal,
  }

  const actionsStyle = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: '8px',
    width: '100%',
  }

  const btnStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: `1px solid ${COLORS.borderDefault}`,
    backgroundColor: COLORS.textPrimary,
    color: COLORS.buttonTextPrimary,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
    transition: 'all 0.2s',
    flex: '1',
    minWidth: '80px',
  }

  const btnPrimaryStyle = { ...btnStyle, backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, border: '1px solid #555' }
  const btnDangerStyle = { ...btnStyle, backgroundColor: COLORS.buttonBgDanger, border: `1px solid ${COLORS.buttonBgDanger}`, color: COLORS.textPrimary }

  const emptyStyle = {
    padding: '12px',
    color: '#888',
    fontSize: '12px',
    border: '1px dashed #333',
    borderRadius: '12px',
    textAlign: 'center',
  }

  async function persistPositions(topicId, rows) {
    // Update positions in parallel; keep it simple for now.
    await Promise.all(
      rows.map((r, idx) =>
        supabase
          .from('planner_videos')
          .update({ position: idx + 1, updated_at: new Date().toISOString() })
          .eq('id', r.id),
      ),
    )
  }

  async function updateCard(topicId, id, patch) {
    setSavingById((p) => ({ ...p, [id]: true }))
    setSaveErrorById((p) => ({ ...p, [id]: '' }))
    const { error } = await supabase
      .from('planner_videos')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.log(error)
      setSaveErrorById((p) => ({ ...p, [id]: error.message || 'Failed to save' }))
    }
    setSavingById((p) => ({ ...p, [id]: false }))
  }

  function patchCardLocal(topicId, id, patch) {
    setByTopic((prev) => ({
      ...prev,
      [topicId]: (prev[topicId] || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }

  function commitIfChanged(topicId, row, patch) {
    const keys = Object.keys(patch)
    const changed = keys.some((k) => (row?.[k] ?? '') !== patch[k])
    if (!changed) return
    void updateCard(topicId, row.id, patch)
  }

  async function onDragEnd(event) {
    const { active, over } = event
    if (!over) return
    if (active.id === over.id) return

    const activeTopicId = active?.data?.current?.topicId
    const overTopicId = over?.data?.current?.topicId
    if (!activeTopicId || !overTopicId) return
    if (activeTopicId !== overTopicId) return // prevent cross-topic drops

    const topicId = activeTopicId
    const list = byTopic[topicId] || []
    const oldIndex = list.findIndex((x) => x.id === active.id)
    const newIndex = list.findIndex((x) => x.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(list, oldIndex, newIndex)
    setByTopic((p) => ({ ...p, [topicId]: next }))
    await persistPositions(topicId, next)
  }

  function SortableCard({ topicId, v, children }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
      id: v.id,
      data: { topicId },
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.75 : 1,
    }

    return <div ref={setNodeRef} style={style}>{children({ attributes, listeners, setActivatorNodeRef })}</div>
  }

  async function deleteCard(topicId, id) {
    setDeleteModal({ open: true, topicId, cardId: id })
  }

  async function confirmDelete() {
    const { topicId, cardId } = deleteModal
    if (!topicId || !cardId) {
      setDeleteModal({ open: false, topicId: null, cardId: null })
      return
    }

    const { error } = await supabase.from('planner_videos').delete().eq('id', cardId)
    if (error) {
      console.log(error)
      setToast({ kind: 'error', text: error.message || 'Failed to delete' })
      setTimeout(() => setToast(null), 2500)
      setDeleteModal({ open: false, topicId: null, cardId: null })
      return
    }

    setByTopic((prev) => ({
      ...prev,
      [topicId]: (prev[topicId] || []).filter((r) => r.id !== cardId),
    }))

    setDeleteModal({ open: false, topicId: null, cardId: null })
    setToast({ kind: 'success', text: 'Deleted from Planner.' })
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <style>{scrollbarStyles}</style>
      <div className="plannerPage" style={pageStyle}>
        <div style={{ padding: '0 22px 16px 22px', fontSize: '28px', fontWeight: 'bold', color: COLORS.textPrimary }}>Content Planner</div>
        <div className="plannerGrid" style={gridStyle}>
          {topicRows.map((row) => (
            <div key={row.map((t) => t.id).join('-')} className="plannerRow" style={rowStyle}>
              {row.map((t) => {
                const rows = byTopic[t.id] || []
                const ids = rows.map((r) => r.id)

                return (
                  <section key={t.id} className="plannerColumn" style={colStyle}>
                    <div style={colHeaderStyle}>
                      <h2 style={colTitleStyle}>{t.name || 'Untitled Topic'}</h2>
                      <button
                        type="button"
                        style={colAddStyle}
                        title="Add"
                        onClick={() => openAddModal(t)}
                      >
                        +
                      </button>
                    </div>

                    <div style={colBodyStyle}>
                      {rows.length === 0 ? <div style={emptyStyle}>No planned videos yet.</div> : null}
                      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                        {rows.map((v) => {
                          const isExpanded = expandedCardId === v.id
                          const isSaving = !!savingById[v.id]
                          const saveError = saveErrorById[v.id]
                          const binded = Array.isArray(v.binded_videos) ? v.binded_videos : []
                          let videoId = null
                          try {
                            if (v.video_link) {
                              const u = new URL(v.video_link)
                              videoId = u.searchParams.get('v')
                            }
                          } catch { }
                          const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : ''

                          return (
                            <SortableCard key={v.id} topicId={t.id} v={v}>
                              {({ attributes, listeners, setActivatorNodeRef }) => (
                                <div className="plannerCard" style={cardStyle} {...attributes}>
                                  {thumbUrl ? <img src={thumbUrl} alt="" style={thumbStyle} /> : null}

                                  <div style={cardBodyStyle}>
                                    <div ref={setActivatorNodeRef} {...listeners} style={{ width: '100%', cursor: 'grab' }}>
                                      <h3 style={h3Style}>{v.video_title || 'Untitled'}</h3>
                                    </div>

                                      <div style={actionsStyle}>
                                        <button
                                          type="button"
                                          style={btnStyle}
                                          onClick={() => setViewModal({ open: true, topicId: t.id, video: v })}
                                        >
                                          View
                                        </button>
                                        <button 
                                          type="button" 
                                          style={btnPrimaryStyle} 
                                          onClick={() => setSchedulingCardId(schedulingCardId === v.id ? null : v.id)}
                                        >
                                          {schedulingCardId === v.id ? 'Cancel' : 'Schedule'}
                                        </button>
                                        <button type="button" style={btnDangerStyle} onClick={() => deleteCard(t.id, v.id)}>
                                          Delete
                                        </button>
                                      </div>

                                      {schedulingCardId === v.id && (
                                        <InlineScheduler 
                                          video={v}
                                          onCancel={() => setSchedulingCardId(null)}
                                          onSave={(videoId) => {
                                            setSchedulingCardId(null);
                                            setByTopic(prev => {
                                              const next = { ...prev };
                                              Object.keys(next).forEach(tid => {
                                                next[tid] = next[tid].filter(row => row.id !== videoId);
                                              });
                                              return next;
                                            });
                                          }}
                                        />
                                      )}
                                    </div>
                                </div>
                              )}
                            </SortableCard>
                          )
                        })}
                      </SortableContext>
                    </div>
                  </section>
                )
              })}

              {row.length < 3
                ? Array.from({ length: 3 - row.length }).map((_, i) => (
                  <div key={`spacer-${i}`} style={{ border: '1px dashed #333', borderRadius: '8px' }} />
                ))
                : null}
            </div>
          ))}
        </div>
      </div>
      {addModal.open ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', zIndex: 50 }}>
          <div style={{ width: 'min(800px, 100%)', backgroundColor: COLORS.bgModal, border: `1px solid ${COLORS.borderDefault}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${COLORS.borderDefault}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: COLORS.textPrimary }}>ADD NEW VIDEO TO {addModal.topic?.name || 'TOPIC'}</h3>
              <button onClick={closeAddModal} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', display: 'block' }}>Title</label>
                <input
                  style={inputStyle}
                  value={addForm.title}
                  maxLength="100"
                  onChange={(e) => {
                    setAddForm((p) => ({ ...p, title: e.target.value }))
                    if (addErrors.title) setAddErrors((p) => ({ ...p, title: '' }))
                  }}
                />
                <div style={{ fontSize: '12px', color: addForm.title.length >= 100 ? COLORS.textError : COLORS.textSecondary, marginTop: '4px' }}>
                  {addForm.title.length}/100
                </div>
                {addErrors.title ? <div style={{ color: COLORS.textError, fontSize: '12px', marginTop: '6px' }}>{addErrors.title}</div> : null}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', display: 'block' }}>Description</label>
                <textarea
                  style={{ ...textareaStyle, minHeight: '100px', resize: 'none' }}
                  value={addForm.description}
                  onChange={(e) => {
                    setAddForm((p) => ({ ...p, description: e.target.value }))
                    if (addErrors.description) setAddErrors((p) => ({ ...p, description: '' }))
                  }}
                />
                {addErrors.description ? (
                  <div style={{ color: COLORS.textError, fontSize: '12px', marginTop: '6px' }}>{addErrors.description}</div>
                ) : null}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#888', marginBottom: '6px', display: 'block' }}>Binded Videos (optional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {addForm.bindedLinks.map((v, idx) => (
                    <input
                      key={idx}
                      style={inputStyle}
                      value={v}
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(e) =>
                        setAddForm((p) => ({
                          ...p,
                          bindedLinks: p.bindedLinks.map((x, i) => (i === idx ? e.target.value : x)),
                        }))
                      }
                    />
                  ))}
                  <button
                    type="button"
                    style={{ ...btnStyle, alignSelf: 'flex-start' }}
                    onClick={() => setAddForm((p) => ({ ...p, bindedLinks: [...p.bindedLinks, ''] }))}
                  >
                    Add video link +
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#888', marginBottom: '6px', display: 'block' }}>Notes</label>
                <textarea
                  style={{ ...textareaStyle, minHeight: '80px', resize: 'none' }}
                  value={addForm.notes}
                  onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ padding: '16px', borderTop: `1px solid ${COLORS.borderDefault}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={addPlannerVideo} style={{ padding: '12px 24px', backgroundColor: COLORS.buttonBgSuccess, color: COLORS.buttonTextPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
              <button type="button" onClick={() => navigate('/scheduler')} style={{ padding: '12px 24px', backgroundColor: COLORS.textPrimary, color: COLORS.buttonTextPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Schedule</button>
              <button type="button" onClick={closeAddModal} style={{ padding: '12px 24px', backgroundColor: COLORS.buttonBgDanger, color: COLORS.textPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}l}

      {deleteModal.open ? (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteModal({ open: false, topicId: null, cardId: null })
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px',
            zIndex: 55,
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              backgroundColor: COLORS.bgModal,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: `1px solid ${COLORS.borderDefault}`,
                background: `linear-gradient(180deg, rgba(239,68,68,0.14), rgba(0,0,0,0))`,
              }}
            >
              <div style={{ fontWeight: 950, fontSize: '16px' }}>Are you sure?</div>
              <div style={{ color: '#bdbdbd', marginTop: '6px', fontSize: '13px' }}>
                This video will be deleted from Planner.
              </div>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: `1px solid ${COLORS.borderDefault}` }}>
              <button
                type="button"
                style={btnStyle}
                onClick={() => setDeleteModal({ open: false, topicId: null, cardId: null })}
              >
                Cancel
              </button>
              <button type="button" style={btnDangerStyle} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          style={{
            position: 'fixed',
            right: '18px',
            bottom: '18px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '1px solid #333',
            backgroundColor: toast.kind === 'success' ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
            color: '#f5f5f5',
            fontSize: '13px',
            fontWeight: 750,
            zIndex: 60,
            boxShadow: '0 16px 50px rgba(0,0,0,0.45)',
          }}
        >
          {toast.text}
        </div>
      ) : null}

      {viewModal.open && viewModal.video ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', zIndex: 50 }}>
          <div style={{ width: 'min(800px, 100%)', backgroundColor: COLORS.bgModal, border: `1px solid ${COLORS.borderDefault}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${COLORS.borderDefault}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: COLORS.textPrimary, wordBreak: 'break-word' }}>{viewModal.video.video_title || 'Untitled'}</h3>
              <button onClick={() => setViewModal({ open: false, topicId: null, video: null })} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', display: 'block' }}>Title</label>
                <textarea
                  style={{ width: '100%', padding: '10px', border: `1px solid ${COLORS.borderDefault}`, backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, borderRadius: '8px', boxSizing: 'border-box', minHeight: '50px', overflow: 'hidden', fontFamily: 'sans-serif', resize: 'none' }}
                  value={viewModal.video.video_title || ''}
                  maxLength="100"
                  onFocus={(e) => autoExpandTextarea(e)}
                  onChange={(e) => {
                    setViewModal(p => ({ ...p, video: { ...p.video, video_title: e.target.value } }))
                    autoExpandTextarea(e)
                  }}
                />
                <div style={{ fontSize: '12px', color: (viewModal.video.video_title || '').length >= 100 ? COLORS.textError : COLORS.textSecondary, marginTop: '4px' }}>
                  {(viewModal.video.video_title || '').length}/100 - Title limit
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', display: 'block' }}>Description</label>
                <textarea
                  style={{ width: '100%', padding: '10px', border: `1px solid ${COLORS.borderDefault}`, backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, borderRadius: '8px', boxSizing: 'border-box', minHeight: '100px', overflow: 'hidden', fontFamily: 'sans-serif', resize: 'none' }}
                  value={viewModal.video.video_description || ''}
                  maxLength="5000"
                  onFocus={(e) => autoExpandTextarea(e)}
                  onChange={(e) => {
                    setViewModal(p => ({ ...p, video: { ...p.video, video_description: e.target.value } }))
                    autoExpandTextarea(e)
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', display: 'block' }}>Binded Videos</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '10px 0' }}>
                  {(Array.isArray(viewModal.video.binded_videos) ? viewModal.video.binded_videos : []).map((b, idx) => (
                    <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={b.thumbnail || ''} alt="" style={{ width: '80px', height: '80px', borderRadius: '8px', border: `1px solid ${COLORS.borderDefault}`, cursor: 'pointer', objectFit: 'cover' }} onClick={() => { const url = b.video_link || (b.video_id ? `https://www.youtube.com/watch?v=${b.video_id}` : ''); if (url) window.open(url, '_blank') }} />
                      <button onClick={() => { const updated = viewModal.video.binded_videos.filter((_, i) => i !== idx); setViewModal(p => ({ ...p, video: { ...p.video, binded_videos: updated } })); if (viewModal.video.id) { patchCardLocal(viewModal.topicId, viewModal.video.id, { binded_videos: updated }); supabase.from('planner_videos').update({ binded_videos: updated }).eq('id', viewModal.video.id).then() } }} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: COLORS.buttonBgDanger, color: COLORS.textPrimary, border: `2px solid ${COLORS.bgModal}`, cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', display: 'block' }}>Notes</label>
                <textarea
                  style={{ width: '100%', padding: '10px', border: `1px solid ${COLORS.borderDefault}`, backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, borderRadius: '8px', boxSizing: 'border-box', minHeight: '80px', overflow: 'hidden', fontFamily: 'sans-serif', resize: 'none' }}
                  value={viewModal.video.notes || ''}
                  maxLength="5000"
                  onFocus={(e) => autoExpandTextarea(e)}
                  onChange={(e) => {
                    setViewModal(p => ({ ...p, video: { ...p.video, notes: e.target.value } }))
                    autoExpandTextarea(e)
                  }}
                />
              </div>
            </div>
            <div style={{ padding: '16px', borderTop: `1px solid ${COLORS.borderDefault}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  if (viewModal.video.id) {
                    const { video_title, video_description, notes } = viewModal.video
                    supabase.from('planner_videos')
                      .update({ video_title, video_description, notes })
                      .eq('id', viewModal.video.id)
                      .then(() => {
                        patchCardLocal(viewModal.topicId, viewModal.video.id, { video_title, video_description, notes })
                        setToast({ kind: 'success', text: '✅ Saved Changes' })
                        setTimeout(() => setToast(null), 2000)
                        setViewModal({ open: false, topicId: null, video: null })
                      })
                  }
                }}
                style={{ padding: '12px 24px', backgroundColor: COLORS.buttonBgSuccess, color: COLORS.buttonTextPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Save
              </button>
              <button onClick={() => navigate('/scheduler')} style={{ padding: '12px 24px', backgroundColor: COLORS.textPrimary, color: COLORS.buttonTextPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Schedule</button>
              <button onClick={() => { supabase.from('planner_videos').delete().eq('id', viewModal.video.id).then(() => { setViewModal({ open: false, topicId: null, video: null }); setByTopic(p => ({ ...p, [viewModal.topicId]: (p[viewModal.topicId] || []).filter(v => v.id !== viewModal.video.id) })) }) }} style={{ padding: '12px 24px', backgroundColor: COLORS.buttonBgDanger, color: COLORS.textPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </DndContext>
  )
}

export default Planner
