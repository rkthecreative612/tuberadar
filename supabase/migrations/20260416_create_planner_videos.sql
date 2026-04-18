-- Planner board items derived from brainstorm videos.
CREATE TABLE IF NOT EXISTS planner_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brainstorm_id uuid REFERENCES brainstorm_items(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES my_channels(id) ON DELETE CASCADE,
  video_title text,
  video_description text,
  video_link text,
  binded_videos jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Useful for fast loading per topic.
CREATE INDEX IF NOT EXISTS planner_videos_topic_position_idx
  ON planner_videos(topic_id, position);

