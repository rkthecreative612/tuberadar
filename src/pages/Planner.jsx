import { useEffect, useMemo, useState, useRef } from 'react'
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
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .plannerCard {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }
  .plannerCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 0 20px var(--topic-color), 0 0 40px rgba(0,0,0,0.8) !important;
    border-color: var(--topic-color) !important;
    z-index: 10;
  }
  .plannerCard:active {
    cursor: grabbing;
  }
  .addBtn:hover {
    background-color: rgba(255,255,255,0.2) !important;
    transform: scale(1.1);
  }
  .plannerCard {
    position: relative !important;
    z-index: 1 !important;
    overflow: hidden !important;
  }
  .plannerCard::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 100%;
    background: var(--topic-color);
    opacity: 0;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
    z-index: -1;
    pointer-events: none;
  }
  .plannerCard:hover::before {
    width: 100%;
    opacity: 0.7;
  }
  .plannerCard:hover h3 {
    color: #fff !important;
    text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  }
  .plannerCard button {
    transition: all 0.2s ease !important;
  }
  .plannerCard button:hover {
    filter: brightness(1.1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .plannerCard button:active {
    transform: scale(0.96);
  }
  @keyframes modalColorShift {
    0% { border-color: #00ffff; box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(0, 255, 255, 0.2), 0 0 100px rgba(0,0,0,0.9); }
    33% { border-color: #22c55e; box-shadow: 0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.2), 0 0 100px rgba(0,0,0,0.9); }
    66% { border-color: #a855f7; box-shadow: 0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(168, 85, 247, 0.2), 0 0 100px rgba(0,0,0,0.9); }
    100% { border-color: #00ffff; box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(0, 255, 255, 0.2), 0 0 100px rgba(0,0,0,0.9); }
  }
  .color-shift-modal {
    animation: modalColorShift 6s infinite linear;
    border: 2px solid #333 !important;
  }
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
  :root {
    color-scheme: dark;
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

const COLOR_PALETTE = [
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4',
  '#ec4899', '#8b5cf6', '#10b981', '#6366f1', '#f43f5e', '#14b8a6'
];

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
  const [activeMenuId, setActiveMenuId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const moveTopic = async (topicId, direction) => {
    const idx = topics.findIndex(t => t.id === topicId);
    if (idx === -1) return;

    let targetIdx = -1;
    if (direction === 'left' && idx > 0) targetIdx = idx - 1;
    if (direction === 'right' && idx < topics.length - 1) targetIdx = idx + 1;

    if (targetIdx === -1) {
      setActiveMenuId(null);
      return;
    }

    const topicA = topics[idx];
    const topicB = topics[targetIdx];

    // Swap created_at to change order (sorted by created_at DESC)
    const timeA = topicA.created_at;
    const timeB = topicB.created_at;

    const { error: errA } = await supabase.from('my_channels').update({ created_at: timeB }).eq('id', topicA.id);
    const { error: errB } = await supabase.from('my_channels').update({ created_at: timeA }).eq('id', topicB.id);

    if (errA || errB) {
      setToast({ kind: 'error', text: 'Failed to move topic' });
      setTimeout(() => setToast(null), 3000);
    } else {
      const newTopics = [...topics];
      newTopics[idx] = { ...topicA, created_at: timeB };
      newTopics[targetIdx] = { ...topicB, created_at: timeA };
      newTopics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTopics(newTopics);
    }
    setActiveMenuId(null);
  };

  const dateInputRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftState, setScrollLeftState] = useState(0)
  const [hasMoved, setHasMoved] = useState(false)

  const handleMouseDown = (e) => {
    // Only right click (button 2)
    if (e.button !== 2) return;
    
    // Only scroll if we click the container background, not buttons or cards
    if (e.target.closest('button') || e.target.closest('.plannerCard')) return;
    
    setIsMouseDown(true)
    setHasMoved(false)
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0))
    setScrollLeftState(scrollContainerRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e) => {
    if (!isMouseDown || !scrollContainerRef.current) return
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const dist = x - startX
    if (Math.abs(dist) > 5) setHasMoved(true)
    
    const walk = dist * 2 
    scrollContainerRef.current.scrollLeft = scrollLeftState - walk
  }

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false)
  }

  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      // If it's a horizontal swipe (deltaX), scroll the grid horizontally
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        scrollContainerRef.current.scrollLeft += e.deltaX;
      }
      // Otherwise, let the browser handle vertical scroll naturally
    }
  }

  const handleContextMenu = (e) => {
    if (hasMoved) {
      e.preventDefault()
    }
  }

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

    if (!title) {
      setToast({ kind: 'error', text: '❌ Title required' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    const topic = addModal.topic
    if (!topic?.id) return

    const { data: lastRow } = await supabase
      .from('planner_videos')
      .select('position')
      .eq('topic_id', topic.id)
      .eq('is_deleted', false)
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
      original_added_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('planner_videos').insert(payload).select('*').single()
    if (error) {
      console.log(error)
      setToast({ kind: 'error', text: '❌ Failed to add video: ' + error.message })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setByTopic((prev) => ({
      ...prev,
      [topic.id]: [...(prev[topic.id] || []), data],
    }))

    closeAddModal()
    setToast({ kind: 'success', text: '✅ Video added to Planner' })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveScheduledVideo(date) {
    const title = addForm.title.trim()
    const description = addForm.description.trim()

    if (!title) {
      setToast({ kind: 'error', text: '❌ Title required' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    const topic = addModal.topic
    if (!topic?.id) return

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
      status: 'scheduled',
      video_title: title,
      video_description: description,
      binded_videos: binded,
      notes: addForm.notes.trim(),
      created_at: `${date}T00:00:00Z`, // Align with Scheduler logic
      original_added_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('planner_videos').insert(payload)
    if (error) {
      console.log(error)
      setToast({ kind: 'error', text: '❌ Failed to schedule video: ' + error.message })
      setTimeout(() => setToast(null), 3000)
      return
    }

    closeAddModal()
    navigate('/scheduler')
    setToast({ kind: 'success', text: '✅ Video scheduled for ' + date })
    setTimeout(() => setToast(null), 3000)
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
            .eq('is_deleted', false)
            .eq('status', 'planning')
            .order('position', { ascending: true })
          
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



  const pageStyle = {
    height: '100vh',
    overflowY: 'auto',
    background: 'radial-gradient(circle at 20% 20%, #161616 0%, #050505 100%)',
    padding: '30px',
    boxSizing: 'border-box',
    color: COLORS.textPrimary,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  }

  const gridStyle = {
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
    paddingBottom: '40px',
    overflowX: 'auto',
    width: '100%',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    flexShrink: 0,
  }



  const colStyle = (color) => ({
    backgroundColor: '#0f0f0f',
    border: `1px solid rgba(255,255,255,0.05)`,
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: '180px',
    width: '340px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  })

  const colHeaderStyle = (topicColor) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderBottom: `2px solid ${topicColor}`,
    boxShadow: `0 4px 16px ${topicColor}40, inset 0 -2px 8px ${topicColor}20`,
    background: `linear-gradient(180deg, ${topicColor}15 0%, rgba(0,0,0,0) 100%)`,
    borderRadius: '8px',
    margin: '12px 12px 0 12px',
  })

  const colTitleStyle = {
    margin: 0,
    fontSize: '13px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#fff',
    opacity: 0.9,
  }

  const colAddStyle = {
    marginLeft: 'auto',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  }

  const colMenuButtonStyle = {
    ...colAddStyle,
    backgroundColor: 'transparent',
    fontSize: '18px',
    paddingBottom: '4px'
  }

  const dropdownMenuStyle = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 100,
    minWidth: '140px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  }

  const menuItemStyle = {
    padding: '12px 16px',
    fontSize: '12px',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.2s',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    fontFamily: 'inherit'
  }

  const colBodyStyle = {
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }

  const cardStyle = (topicColor, isDragging = false) => {
    const topicColorDark = topicColor + '88';
    return {
      border: `2px solid transparent`,
      backgroundImage: `linear-gradient(#1e1e1e, #1e1e1e), linear-gradient(135deg, ${topicColor}, ${topicColorDark})`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
      boxShadow: isDragging 
        ? `0 0 40px ${topicColor}90, inset 0 0 30px ${topicColor}40` 
        : `0 0 20px ${topicColor}30, inset 0 0 20px ${topicColor}10`,
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      '--topic-color': topicColor || '#444',
      transform: isDragging ? 'scale(1.05)' : 'scale(1)',
      zIndex: isDragging ? 50 : 1,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    }
  }

  const thumbStyle = {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    backgroundColor: COLORS.bgMain,
  }

  const cardBodyStyle = {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }

  const h3Style = { 
    margin: 0, 
    fontSize: '13px', 
    fontWeight: 700, 
    lineHeight: 1.4,
    color: '#eee',
    letterSpacing: '0.01em'
  }

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
    gap: '5px',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    marginTop: '8px',
    width: '100%',
  }

  const btnStyle = {
    padding: '6px 4px',
    borderRadius: '4px',
    border: `1px solid ${COLORS.borderDefault}`,
    backgroundColor: COLORS.textPrimary,
    color: COLORS.buttonTextPrimary,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '11px',
    transition: 'all 0.2s',
    flex: '1',
    minWidth: '0',
    whiteSpace: 'nowrap',
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
      opacity: isDragging ? 0.9 : 1,
      zIndex: isDragging ? 100 : 1,
    }

    return <div ref={setNodeRef} style={style}>{children({ attributes, listeners, setActivatorNodeRef, isDragging })}</div>
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

    const { error } = await supabase
      .from('planner_videos')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', cardId)
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
      <div 
        className="plannerPage" 
        style={{ ...pageStyle, cursor: isMouseDown ? 'grabbing' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <div style={{ padding: '0 22px 30px 22px', fontSize: '42px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.15em', background: 'linear-gradient(to bottom, #ffffff 30%, #555555 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0px 8px 16px rgba(255,255,255,0.1))', fontFamily: '"Inter", system-ui, sans-serif' }}>Board</div>
        <div 
          ref={scrollContainerRef}
          className="plannerGrid hide-scrollbar" 
          style={gridStyle}
        >
          {topics.map((t, index) => {
            const rows = byTopic[t.id] || []
            const ids = rows.map((r) => r.id)

            return (
              <section key={t.id} className="plannerColumn" style={colStyle(t.color || COLOR_PALETTE[index % COLOR_PALETTE.length])}>
                <div style={colHeaderStyle(t.color || COLOR_PALETTE[index % COLOR_PALETTE.length])}>
                  <h2 style={colTitleStyle}>{t.name || 'Untitled Topic'}</h2>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                    <button
                      type="button"
                      className="addBtn"
                      style={colAddStyle}
                      title="Add"
                      onClick={() => openAddModal(t)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="addBtn"
                      style={colMenuButtonStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === t.id ? null : t.id);
                      }}
                    >
                      ⋮
                    </button>
                    
                    {activeMenuId === t.id && (
                      <div ref={menuRef} style={dropdownMenuStyle}>
                        <button 
                          style={{...menuItemStyle, opacity: index === 0 ? 0.3 : 1}} 
                          onClick={() => index > 0 && moveTopic(t.id, 'left')}
                          disabled={index === 0}
                        >
                          ← Move Left
                        </button>
                        <button 
                          style={{...menuItemStyle, opacity: index === topics.length - 1 ? 0.3 : 1}} 
                          onClick={() => index < topics.length - 1 && moveTopic(t.id, 'right')}
                          disabled={index === topics.length - 1}
                        >
                          Move Right →
                        </button>
                        <style>{`
                          button:hover { background-color: rgba(255,255,255,0.05) !important; }
                        `}</style>
                      </div>
                    )}
                  </div>
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
                          {({ attributes, listeners, setActivatorNodeRef, isDragging }) => (
                            <div className="plannerCard" style={cardStyle(t.color || COLOR_PALETTE[index % COLOR_PALETTE.length], isDragging)} {...attributes}>
                              {thumbUrl ? <img src={thumbUrl} alt="" style={thumbStyle} /> : null}

                              <div style={cardBodyStyle}>
                                <div ref={setActivatorNodeRef} {...listeners} style={{ width: '100%', cursor: 'grab' }}>
                                  <h3 style={h3Style}>{v.video_title || 'Untitled'}</h3>
                                </div>

                                <div style={actionsStyle}>
                                  <button
                                    type="button"
                                    style={btnStyle}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewModal({ open: true, topicId: t.id, video: v }); }}
                                  >
                                    View
                                  </button>
                                  <button 
                                    type="button" 
                                    style={btnPrimaryStyle} 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSchedulingCardId(schedulingCardId === v.id ? null : v.id); }}
                                  >
                                    {schedulingCardId === v.id ? 'Cancel' : 'Schedule'}
                                  </button>
                                  <button 
                                    type="button" 
                                    style={btnDangerStyle} 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteCard(t.id, v.id); }}
                                  >
                                    Delete
                                  </button>
                                </div>

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
        </div>
      </div>
      {addModal.open ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', zIndex: 50 }}>
          <div className="color-shift-modal" style={{ width: 'min(800px, 100%)', backgroundColor: COLORS.bgModal, borderRadius: '16px', overflow: 'hidden' }}>
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
                  }}
                />
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

            <div style={{ padding: '16px', borderTop: `1px solid ${COLORS.borderDefault}`, display: 'flex', justifyContent: 'flex-end', gap: '10px', position: 'relative' }}>
              <input 
                type="date" 
                ref={dateInputRef}
                style={{ position: 'absolute', visibility: 'hidden', bottom: '100%', right: '90px' }}
                onChange={(e) => {
                  if (e.target.value) saveScheduledVideo(e.target.value)
                }}
              />
              <button type="button" onClick={addPlannerVideo} style={{ padding: '12px 24px', backgroundColor: COLORS.buttonBgSuccess, color: COLORS.buttonTextPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
              <button 
                type="button" 
                onClick={() => {
                  const title = addForm.title.trim()
                  if (!title) {
                    setToast({ kind: 'error', text: '❌ Title required' })
                    setTimeout(() => setToast(null), 3000)
                    return
                  }
                  dateInputRef.current.showPicker?.() || dateInputRef.current.click()
                }} 
                style={{ padding: '12px 24px', backgroundColor: COLORS.textPrimary, color: COLORS.buttonTextPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Schedule
              </button>
              <button type="button" onClick={closeAddModal} style={{ padding: '12px 24px', backgroundColor: COLORS.buttonBgDanger, color: COLORS.textPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}

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
          <div className="color-shift-modal" style={{ width: 'min(800px, 100%)', backgroundColor: COLORS.bgModal, borderRadius: '16px', overflow: 'hidden' }}>
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

      {schedulingCardId && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '18px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSchedulingCardId(null);
            }
          }}
        >
          <div 
            style={{
              backgroundColor: COLORS.bgModal,
              borderRadius: '16px',
              padding: '0',
              maxWidth: '380px',
              width: '100%',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <InlineScheduler 
              video={Object.values(byTopic).flat().find(v => v.id === schedulingCardId)}
              onCancel={() => setSchedulingCardId(null)}
              onSave={(videoId, dateStr) => {
                setSchedulingCardId(null);
                setToast({ kind: 'success', text: `✅ Video scheduled for ${dateStr}` });
                setTimeout(() => setToast(null), 3000);
                setByTopic(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(tid => {
                    next[tid] = next[tid].filter(row => row.id !== videoId);
                  });
                  return next;
                });
              }}
            />
          </div>
        </div>
      )}
    </DndContext>
  )
}

export default Planner
