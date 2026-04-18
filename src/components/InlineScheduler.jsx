import React, { useState } from 'react';
import supabase from '../lib/supabase';

const COLORS = {
  textSecondary: '#888888',
  accent: '#ef4444',
  border: '#333333',
};

const InlineScheduler = ({ video, onSave, onCancel }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState({ hour: '10', minute: '00' });
  const [isSaving, setIsSaving] = useState(false);

  // Calendar logic (Mon-Sun)
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  let startDay = startOfMonth.getDay(); 
  startDay = startDay === 0 ? 6 : startDay - 1;

  const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  const daysInMonth = endOfMonth.getDate();

  const days = [];
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthEnd - i, month: 'prev', date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthEnd - i) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, month: 'current', date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i) });
  }
  const totalCells = days.length > 28 ? 42 : 35;
  const remaining = totalCells - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, month: 'next', date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i) });
  }

  const handlePrevMonth = (e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); };
  const handleNextMonth = (e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!selectedDate) return;
    setIsSaving(true);
    try {
      // NOTE: For Phase 1, we still only save the date part. 
      const { error } = await supabase
        .from('planner_videos')
        .update({ 
          status: 'scheduled', 
          created_at: selectedDate.toISOString() 
        })
        .eq('id', video.id);

      if (error) throw error;
      
      alert(`✅ Video scheduled for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
      onSave(video.id);
    } catch (err) {
      console.error(err);
      alert('Failed to schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const containerStyle = {
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
  };

  const selectStyle = {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: '1px solid #333',
    padding: '6px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    flex: 1,
  };

  const dayOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const hoursArr = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesArr = ['00', '15', '30', '45'];

  return (
    <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
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
        {days.map((d, i) => {
          const isSelected = selectedDate && d.date.toDateString() === selectedDate.toDateString();
          const isCurrentMonth = d.month === 'current';
          return (
            <div 
              key={i}
              onClick={() => isCurrentMonth && setSelectedDate(d.date)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                borderRadius: '2px',
                cursor: isCurrentMonth ? 'pointer' : 'default',
                backgroundColor: isSelected ? COLORS.accent : 'transparent',
                color: isSelected ? '#fff' : (isCurrentMonth ? '#ccc' : '#444'),
              }}
            >
              {d.day}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #222', paddingTop: '10px' }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>Time (Optional):</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select 
            style={selectStyle} 
            value={selectedTime.hour} 
            onChange={(e) => setSelectedTime({ ...selectedTime, hour: e.target.value })}
          >
            {hoursArr.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <span style={{ color: '#888' }}>:</span>
          <select 
            style={selectStyle} 
            value={selectedTime.minute} 
            onChange={(e) => setSelectedTime({ ...selectedTime, minute: e.target.value })}
          >
            {minutesArr.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
        >Cancel</button>
        <button 
          onClick={handleSave}
          disabled={!selectedDate || isSaving}
          style={{ 
            flex: 1,
            padding: '8px', 
            background: selectedDate ? COLORS.accent : '#222', 
            color: selectedDate ? '#fff' : '#555', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '11px', 
            fontWeight: 'bold', 
            cursor: selectedDate ? 'pointer' : 'not-allowed' 
          }}
        >
          {isSaving ? '...' : 'Save Schedule'}
        </button>
      </div>
    </div>
  );
};

export default InlineScheduler;
