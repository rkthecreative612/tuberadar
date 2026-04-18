import React, { useState } from 'react';
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
  bgCellActive: '#1a1a1a',
  bgCellOther: '#0a0a0a',
  border: '#333333',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#444444',
  videoCardBg: '#1a1a1a',
  videoCardHover: '#252525',
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
    opacity: isDragging && !isOverlay ? 0 : 1, // Hide original while dragging
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

const DroppableDayCell = ({ dayObj, isToday, isCurrentMonth, idx, videos, topicColors, onVideoClick }) => {
  const dateKey = dayObj.date.toDateString();
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateKey}`,
    data: { date: dayObj.date }
  });

  const cellStyle = {
    border: `1px solid ${COLORS.border}`,
    padding: '4px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    backgroundColor: isCurrentMonth 
      ? (isOver ? 'rgba(239, 68, 68, 0.1)' : COLORS.bgCell) 
      : COLORS.bgCellOther,
    minHeight: 0,
    height: '120px',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: isOver ? 'inset 0 0 10px rgba(239, 68, 68, 0.3)' : undefined,
    borderColor: isOver ? '#ef4444' : (isToday ? '#444' : COLORS.border),
    borderWidth: isOver ? '2px' : '1px',
    transition: 'all 0.1s ease',
  };

  return (
    <div ref={setNodeRef} style={cellStyle}>
      <div style={{
        fontSize: '11px',
        fontWeight: isToday ? 'bold' : 'normal',
        color: isCurrentMonth ? (isToday ? '#ef4444' : COLORS.textPrimary) : COLORS.textMuted,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2px',
        flexShrink: 0
      }}>
        <span>{dayObj.day}</span>
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
          paddingBottom: videos.length > 2 ? '16px' : '0' 
        }}
      >
        {videos.map(video => (
          <DraggableVideoCard 
            key={video.id} 
            video={video} 
            color={topicColors[video.topic_id] || '#888'} 
            onVideoClick={onVideoClick} 
          />
        ))}
      </div>

      {videos.length > 2 && (
        <div style={{ 
          position: 'absolute',
          bottom: '2px',
          right: '6px',
          fontSize: '9px', 
          color: COLORS.textSecondary, 
          fontWeight: 'bold',
          pointerEvents: 'none',
          backgroundColor: 'rgba(15,15,15,0.8)',
          padding: '1px 3px',
          borderRadius: '2px'
        }}>
          + {videos.length - 2} more
        </div>
      )}
    </div>
  );
};

const SchedulerCalendar = ({ currentMonth, videos, topicColors, onVideoClick, onMoveVideo }) => {
  const [activeVideo, setActiveVideo] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  let startDay = startOfMonth.getDay(); 
  startDay = startDay === 0 ? 6 : startDay - 1;

  const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  const daysInMonth = endOfMonth.getDate();

  const videosByDate = videos.reduce((acc, video) => {
    const dateKey = new Date(video.created_at).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(video);
    return acc;
  }, {});

  const daysArr = [];
  for (let i = startDay - 1; i >= 0; i--) {
    daysArr.push({ day: prevMonthEnd - i, month: 'prev', date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthEnd - i) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArr.push({ day: i, month: 'current', date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i) });
  }
  const totalCells = 42; 
  const remainingCells = totalCells - daysArr.length;
  for (let i = 1; i <= remainingCells; i++) {
    daysArr.push({ day: i, month: 'next', date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i) });
  }

  const handleDragStart = (event) => {
    const { active } = event;
    const video = videos.find(v => `video-${v.id}` === active.id);
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

  const dayOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#161616',
        }}>
          {dayOfWeek.map(d => (
            <div key={d} style={{ 
              padding: '8px', 
              textAlign: 'center', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              color: COLORS.textSecondary, 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              borderRight: `1px solid ${COLORS.border}`,
              borderBottom: `1px solid ${COLORS.border}`
            }}>{d}</div>
          ))}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: 'repeat(6, 1fr)',
          flex: 1,
          minHeight: 0,
        }}>
          {daysArr.map((dayObj, idx) => {
            const dateKey = dayObj.date.toDateString();
            const dayVideos = videosByDate[dateKey] || [];
            return (
              <DroppableDayCell 
                key={idx}
                dayObj={dayObj}
                isToday={new Date().toDateString() === dateKey}
                isCurrentMonth={dayObj.month === 'current'}
                idx={idx}
                videos={dayVideos}
                topicColors={topicColors}
                onVideoClick={onVideoClick}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
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
