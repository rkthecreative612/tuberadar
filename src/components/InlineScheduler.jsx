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
  const [selectedTime, setSelectedTime] = useState({ hour: '00', minute: '00' });
  const [isTimeSelected, setIsTimeSelected] = useState(false);
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
        created_at: localDate.toISOString() 
      };

      if (isTimeSelected) {
        updateObj.scheduled_time = `${selectedTime.hour}:${selectedTime.minute}`;
      }

      const { error } = await supabase
        .from('planner_videos')
        .update(updateObj)
        .eq('id', video.id);

      if (error) throw error;
      
      const timeDisplay = isTimeSelected ? ` at ${format12h(selectedTime.hour, selectedTime.minute)}` : '';
      alert(`✅ Video scheduled for ${selectedDateStr}${timeDisplay}`);
      onSave(video.id);
    } catch (err) {
      console.error(err);
      alert('Failed to schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const format12h = (h, m) => {
    const hh = parseInt(h);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const dayOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const hoursArr = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesArr = ['00', '15', '30', '45'];

  return (
    <div style={{
      width: '100%',
      maxWidth: '300px',
      backgroundColor: '#111',
      borderRadius: '8px',
      border: `1px solid ${COLORS.border}`,
      marginTop: '10px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 1,
    }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
          {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={handlePrevMonth} style={{ background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>←</button>
          <button onClick={handleNextMonth} style={{ background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>→</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
        {dayOfWeek.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: 'bold' }}>{d}</div>
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
                fontSize: '10px',
                borderRadius: '2px',
                cursor: d.isCurrentMonth ? 'pointer' : 'default',
                backgroundColor: isSelected ? COLORS.accent : 'transparent',
                color: isSelected ? '#fff' : (d.isCurrentMonth ? (isToday ? COLORS.accent : '#ccc') : '#444'),
                fontWeight: isToday ? 'bold' : 'normal'
              }}
            >
              {d.day}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #222', paddingTop: '10px' }}>
        <div style={{ fontSize: '11px', color: isTimeSelected ? '#888' : '#444', marginBottom: '8px' }}>
          Time (Optional - {isTimeSelected ? 'Selected' : 'None'}):
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isTimeSelected ? 1 : 0.5 }}>
          <select 
            style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', padding: '6px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', flex: 1 }} 
            value={selectedTime.hour} 
            onChange={(e) => {
              setSelectedTime({ ...selectedTime, hour: e.target.value });
              setIsTimeSelected(true);
            }}
          >
            {hoursArr.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <span style={{ color: '#888' }}>:</span>
          <select 
            style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', padding: '6px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', flex: 1 }} 
            value={selectedTime.minute} 
            onChange={(e) => {
              setSelectedTime({ ...selectedTime, minute: e.target.value });
              setIsTimeSelected(true);
            }}
          >
            {minutesArr.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {selectedDateStr && (
          <div style={{ fontSize: '10px', color: COLORS.accent, marginTop: '8px', textAlign: 'center' }}>
            {selectedDateStr} {isTimeSelected ? `at ${format12h(selectedTime.hour, selectedTime.minute)}` : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
        >Cancel</button>
        <button 
          onClick={handleSave}
          disabled={!selectedDateStr || isSaving}
          style={{ 
            flex: 1,
            padding: '8px', 
            background: selectedDateStr ? COLORS.accent : '#222', 
            color: selectedDateStr ? '#fff' : '#555', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '11px', 
            fontWeight: 'bold', 
            cursor: selectedDateStr ? 'pointer' : 'not-allowed' 
          }}
        >
          {isSaving ? '...' : 'Save Schedule'}
        </button>
      </div>
    </div>
  );
};

export default InlineScheduler;
