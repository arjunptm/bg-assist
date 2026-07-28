ALTER TABLE assignment_options
ADD COLUMN color TEXT
CHECK(color IS NULL OR color IN (
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'gray'
));
