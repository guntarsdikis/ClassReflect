#!/bin/bash

echo "ClassReflect Test Data Cleanup Script"
echo "======================================"
echo ""
echo "This will delete:"
echo "- All audio files from S3"
echo "- All records from audio_jobs table"
echo "- All records from transcripts table"
echo ""
read -p "Are you sure you want to delete all test data? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Cleaning up S3 audio files..."
aws s3 rm s3://classreflect-audio-files-573524060586/audio-files/ --recursive --region eu-west-2

echo ""
echo "Cleaning up database..."
mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com \
      -u gdwd \
      -p'YOUR_PASSWORD_HERE' \
      classreflect << EOF
-- Delete transcripts first (foreign key constraint)
DELETE FROM transcripts;
-- Delete all audio jobs
DELETE FROM audio_jobs;
-- Reset any other test data if needed
-- DELETE FROM analysis_results;
-- DELETE FROM teacher_progress;
EOF

echo ""
echo "Verifying cleanup..."
echo "S3 files remaining:"
aws s3 ls s3://classreflect-audio-files-573524060586/audio-files/ --recursive --region eu-west-2 | wc -l

echo ""
echo "Database records remaining:"
mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com \
      -u gdwd \
      -p'YOUR_PASSWORD_HERE' \
      classreflect \
      -e "SELECT 'audio_jobs' as table_name, COUNT(*) as count FROM audio_jobs 
          UNION ALL 
          SELECT 'transcripts', COUNT(*) FROM transcripts;" 2>/dev/null

echo ""
echo "✅ Cleanup complete!"