import React, { useState, useMemo } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';

const COLORS = {
  bgCell: '#0f0f0f',
  bgCellActive: '#1a1212',
  bgCellOther: '#0a0a0a',
  border: '#333333',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#444444',
  videoCardBg: '#1a1a1a',
  videoCardHover: '#252525',
};

// --- Utility Functions ---

// Convert any date to local YYYY-MM-DD string (ignore timezone)
const getLocalDateString = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Convert YYYY-MM-DD string back to Date object at local midnight
const dateStringToDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// Get start of week (Monday) for any date
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust for Monday start (Monday=1...Sunday=0)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const internalScrollbarStyle = `
  .video-container::-webkit-scrollbar {
    display: none;
  }
  .video-container {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// --- Components ---

const DraggableVideoCard = ({ video, color, onVideoClick, isOverlay }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `video-${video.id}`,
    data: { video }
  });

  const getHoverColor = (hex) => {
    if (hex === '#ef4444') return '#dc2626';
    if (hex === '#22c55e') return '#16a34a';
    if (hex === '#3b82f6') return '#2563eb';
    return hex;
  };

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging && !isOverlay ? 0 : 1,
    backgroundColor: color,
    padding: '6px 8px',
    borderRadius: '4px',
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: 'background-color 0.1s, opacity 0.2s',
    fontSize: '11px',
    fontWeight: '500',
    color: '#ffffff',
    overflow: 'hidden',
    marginBottom: '1px',
    zIndex: isOverlay ? 1000 : (isDragging ? 1000 : 1),
    position: 'relative',
    touchAction: 'none'
  };

  if (isOverlay) {
    style.opacity = 0.7;
    style.transform = 'rotate(5deg)';
    style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)';
    style.cursor = 'grabbing';
    style.pointerEvents = 'none';
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      onClick={(e) => {
        if (!transform && !isOverlay) onVideoClick(video);
      }}
      onMouseEnter={(e) => !isDragging && !isOverlay && (e.currentTarget.style.backgroundColor = getHoverColor(color))}
      onMouseLeave={(e) => !isDragging && !isOverlay && (e.currentTarget.style.backgroundColor = color)}
    >
      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {video.video_title.substring(0, 30)}{video.video_title.length > 30 ? '...' : ''}
      </div>
    </div>
  );
};

const DroppableDayCell = ({ day, topicColors, onVideoClick }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${day.dateStr}`,
    data: { dateStr: day.dateStr }
  });

  const isToday = getLocalDateString(new Date()) === day.dateStr;

  const cellStyle = {
    padding: '4px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    backgroundColor: day.isCurrentMonth 
      ? (isOver ? COLORS.bgCellActive : COLORS.bgCell) 
      : COLORS.bgCellOther,
    opacity: day.isCurrentMonth ? 1 : 0.5,
    position: 'relative',
    boxShadow: isOver ? 'inset 0 0 10px rgba(239, 68, 68, 0.3)' : undefined,
    border: isOver ? '2px solid #ef4444' : (isToday ? '1px solid #555' : `1px solid ${COLORS.border}`),
    transition: 'all 0.1s ease',
    overflow: 'hidden'
  };

  return (
    <div ref={setNodeRef} style={cellStyle}>
      <div style={{
        fontSize: '11px',
        fontWeight: isToday ? 'bold' : 'normal',
        color: day.isCurrentMonth ? (isToday ? '#ef4444' : COLORS.textPrimary) : COLORS.textMuted,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2px',
        flexShrink: 0
      }}>
        <span>{day.dateNum}</span>
        {isToday && <span style={{ fontSize: '9px', backgroundColor: '#ef4444', color: '#fff', padding: '0px 3px', borderRadius: '3px' }}>TODAY</span>}
      </div>

      <div 
        className="video-container"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '3px', 
          overflowY: 'auto', 
          flex: 1,
          paddingBottom: day.videos.length > 3 ? '16px' : '0' 
        }}
      >
        {day.videos.slice(0, 3).map(video => (
          <DraggableVideoCard 
            key={video.id} 
            video={video} 
            color={topicColors[video.topic_id] || '#888'} 
            onVideoClick={onVideoClick} 
          />
        ))}
      </div>

      {day.videos.length > 3 && (
        <div 
          title={day.videos.slice(3).map(v => v.video_title).join('\n')}
          style={{ 
            position: 'absolute',
            bottom: '2px',
            right: '6px',
            fontSize: '9px', 
            color: COLORS.textSecondary, 
            fontWeight: 'bold',
            backgroundColor: 'rgba(15,15,15,0.8)',
            padding: '1px 3px',
            borderRadius: '2px',
            cursor: 'help'
          }}
        >
          + {day.videos.length - 3} more
        </div>
      )}
    </div>
  );
};

// --- Main Calendar ---

const SchedulerCalendar = ({ currentMonth, videos, topicColors, onVideoClick, onMoveVideo }) => {
  const [activeVideo, setActiveVideo] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const videosByDate = useMemo(() => {
    const grouped = {};
    videos.forEach(video => {
      const dateStr = getLocalDateString(video.created_at);
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(video);
    });
    return grouped;
  }, [videos]);

  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const firstMonday = getMonday(firstDayOfMonth);
    
    const weeks = [];
    let currentDate = new Date(firstMonday);
    
    // Determine how many weeks are needed (5 or 6)
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const endOf5thWeek = new Date(firstMonday);
    endOf5thWeek.setDate(endOf5thWeek.getDate() + 35);
    const numWeeksNeeded = lastDayOfMonth >= endOf5thWeek ? 6 : 5;

    for (let w = 0; w < numWeeksNeeded; w++) {
      for (let d = 0; d < 7; d++) {
        const dateStr = getLocalDateString(currentDate);
        weeks.push({
          dateStr,
          dateNum: currentDate.getDate(),
          isCurrentMonth: currentDate.getMonth() === month,
          videos: videosByDate[dateStr] || []
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return weeks;
  }, [currentMonth, videosByDate]);

  const handleDragStart = (event) => {
    const { active } = event;
    const videoId = active.id.replace('video-', '');
    const video = videos.find(v => v.id === videoId);
    setActiveVideo(video);
  };

  const handleDragEnd = (event) => {
    const { over } = event;
    if (over && activeVideo) {
      const newDateStr = over.id.replace('day-', '');
      onMoveVideo(activeVideo.id, newDateStr);
    }
    setActiveVideo(null);
  };

  const dayOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bgCell,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <style>{internalScrollbarStyle}</style>
        
        {/* Header Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#161616',
          borderBottom: `1px solid ${COLORS.border}`,
          gap: '1px'
        }}>
          {dayOfWeek.map(d => (
            <div key={d} style={{ 
              padding: '10px 8px', 
              textAlign: 'center', 
              fontSize: '10px', 
              fontWeight: '900', 
              color: '#555', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              backgroundColor: '#0f0f0f'
            }}>{d}</div>
          ))}
        </div>

        {/* Calendar Body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `repeat(${calendarGrid.length / 7}, 1fr)`,
          flex: 1,
          minHeight: 0,
          backgroundColor: COLORS.border, // Becomes the gap/border color
          gap: '1px'
        }}>
          {calendarGrid.map((day, idx) => (
            <DroppableDayCell 
              key={idx}
              day={day}
              topicColors={topicColors}
              onVideoClick={onVideoClick}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeVideo ? (
          <DraggableVideoCard 
            video={activeVideo} 
            color={topicColors[activeVideo.topic_id] || '#888'} 
            isOverlay={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SchedulerCalendar;
