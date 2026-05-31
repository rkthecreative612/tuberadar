import React, { useState, useMemo } from 'react';
import supabase from '../lib/supabase';

const COLORS = {
  textSecondary: '#888888',
  accent: '#ef4444',
  border: '#333333',
};

// --- Utility Functions ---

const getLocalDateString = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const InlineScheduler = ({ video, onSave, onCancel }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstMonday = getMonday(firstDay);
    
    const daysArr = [];
    let curr = new Date(firstMonday);
    
    for (let i = 0; i < 42; i++) {
      daysArr.push({
        day: curr.getDate(),
        dateStr: getLocalDateString(curr),
        isCurrentMonth: curr.getMonth() === month
      });
      curr.setDate(curr.getDate() + 1);
    }
    return daysArr;
  }, [currentMonth]);

  const handlePrevMonth = (e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); };
  const handleNextMonth = (e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!selectedDateStr) return;
    setIsSaving(true);
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const localDate = new Date(y, m - 1, d, 0, 0, 0, 0);

      const updateObj = { 
        status: 'scheduled', 
        video_status: 'none',
        created_at: localDate.toISOString() 
      };



      const { error } = await supabase
        .from('planner_videos')
        .update(updateObj)
        .eq('id', video.id);

      if (error) throw error;
      onSave(video.id, selectedDateStr);
    } catch (err) {
      console.error(err);
      alert('Failed to schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const dayOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#0c0c0c',
      borderRadius: '16px',
      border: `1px solid rgba(239, 68, 68, 0.4)`,
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 1,
      boxShadow: '0 0 30px rgba(239, 68, 68, 0.2), 0 20px 60px rgba(0,0,0,0.7)',
      boxSizing: 'border-box'
    }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 950, color: '#fff', letterSpacing: '-0.02em' }}>
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handlePrevMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>←</button>
          <button onClick={handleNextMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>→</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
        {dayOfWeek.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: '#666', fontWeight: 600, paddingBottom: '8px' }}>{d}</div>
        ))}
        {calendarGrid.map((d, i) => {
          const isSelected = selectedDateStr === d.dateStr;
          const isToday = getLocalDateString(new Date()) === d.dateStr;
          return (
            <div 
              key={i}
              onClick={() => d.isCurrentMonth && setSelectedDateStr(d.dateStr)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                borderRadius: '6px',
                cursor: d.isCurrentMonth ? 'pointer' : 'default',
                backgroundColor: isSelected ? COLORS.accent : 'transparent',
                color: isSelected ? '#fff' : (d.isCurrentMonth ? (isToday ? COLORS.accent : '#eee') : '#444'),
                fontWeight: isToday ? 800 : 500,
                transition: 'all 0.2s',
              }}
            >
              {d.day}
            </div>
          );
        })}
      </div>



      <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >Cancel</button>
        <button 
          onClick={handleSave}
          disabled={!selectedDateStr || isSaving}
          style={{ 
            flex: 1,
            padding: '12px', 
            background: selectedDateStr ? COLORS.accent : '#222', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '10px', 
            fontSize: '14px', 
            fontWeight: 800, 
            cursor: selectedDateStr ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: selectedDateStr ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
          }}
        >
          {isSaving ? '...' : 'Save Schedule'}
        </button>
      </div>
    </div>
  );
};

export default InlineScheduler;
