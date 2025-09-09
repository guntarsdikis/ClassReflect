import { useState } from 'react';
import {
  Container,
  Grid,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Progress,
  Stack,
  Button,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Loader,
  Alert,
  ActionIcon,
  Modal,
} from '@mantine/core';
import {
  IconFileText,
  IconTrendingUp,
  IconClock,
  IconStar,
  IconEye,
  IconDownload,
  IconChartBar,
  IconRefresh,
  IconCheck,
  IconMicrophone,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { RecordingsService } from '@features/recordings/services/recordings.service';
import { useQuery } from '@tanstack/react-query';
import { jobsService } from '@features/jobs/services/jobs.service';
import { useAuthStore } from '@store/auth.store';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Types for teacher job data - matching backend response
interface TeacherJob {
  id: string;
  class_name: string;
  subject: string;
  grade: string;
  file_name: string;
  created_at: string;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage?: number;
  has_analysis?: number;
  analysis_count?: number;
  latest_score?: number;
  transcript_content?: string;
  word_count?: number;
  confidence_score?: number;
  teacher_name: string;
  first_name: string;
  last_name: string;
  school_name: string;
}

const getStatusInfo = (job: TeacherJob) => {
  switch (job.status) {
    case 'pending':
    case 'uploading':
      return { label: 'Uploading', color: 'blue', progress: 25 };
    case 'queued':
    case 'processing':
      return { label: 'Processing', color: 'orange', progress: job.progress_percentage || 50 };
    case 'completed':
      return { label: 'Completed', color: 'green', progress: 100 };
    case 'failed':
      return { label: 'Failed', color: 'red', progress: 0 };
    default:
      return { label: 'Unknown', color: 'gray', progress: 0 };
  }
};

export function TeacherDashboard() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [playbackModalOpened, setPlaybackModalOpened] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackFileName, setPlaybackFileName] = useState<string | null>(null);
  
  // Fetch teacher's jobs/recordings
  const { data: jobs, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useQuery({
    queryKey: ['teacher-jobs', user?.id],
    queryFn: () => jobsService.getTeacherJobs(user!.id.toString()),
    enabled: !!user?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds as per plan
  });

  // Ensure jobs data is always an array - backend returns { jobs: [...], count: N }
  const jobsData = Array.isArray(jobs?.jobs) ? jobs.jobs : [];
  
  const recentJobs = jobsData.slice(0, 5); // Last 5-7 recordings as per plan
  
  // Calculate stats from real data
  const totalRecordings = jobsData.length;
  const thisMonthRecordings = jobsData.filter((job: TeacherJob) => {
    const uploadDate = new Date(job.created_at);
    const now = new Date();
    return uploadDate.getMonth() === now.getMonth() && uploadDate.getFullYear() === now.getFullYear();
  }).length;
  
  const analyzedJobs = jobsData.filter((job: TeacherJob) => job.has_analysis > 0);
  const averageScore = analyzedJobs.length > 0 
    ? Math.round(analyzedJobs.reduce((sum: number, job: TeacherJob) => sum + (job.latest_score || 0), 0) / analyzedJobs.length)
    : null;

  const stats = [
    {
      title: 'Total Recordings',
      value: totalRecordings.toString(),
      icon: IconFileText,
      color: 'blue',
    },
    {
      title: 'Average Score',
      value: averageScore ? `${averageScore}%` : 'N/A',
      icon: IconStar,
      color: 'yellow',
    },
    {
      title: 'This Month',
      value: thisMonthRecordings.toString(),
      icon: IconClock,
      color: 'green',
    },
    {
      title: 'Analyzed',
      value: analyzedJobs.length.toString(),
      icon: IconTrendingUp,
      color: 'teal',
    },
  ];

  const listenRecording = async (job: TeacherJob) => {
    try {
      const data = await RecordingsService.getPlaybackUrl(job.id);
      setPlaybackUrl(data.url);
      setPlaybackFileName(data.fileName);
      setPlaybackModalOpened(true);
    } catch (e: any) {
      // Silent fail with a subtle hint via console; UI is already busy
      console.error('Playback error:', e);
    }
  };

  if (jobsError) {
    return (
      <Container size="xl">
        <Alert color="red" title="Error loading dashboard">
          <Text mb="md">Unable to load your recordings and analytics.</Text>
          <Text size="sm" c="dimmed" mb="md">
            {jobsError.message}
          </Text>
          <Button onClick={() => refetchJobs()} mt="md">
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      {/* Welcome Header with personalized greeting */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>
            Welcome back, {user?.firstName}!
          </Title>
          <Text c="dimmed" size="sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • {totalRecordings} total recordings
          </Text>
        </div>
        <Group>
          <ActionIcon 
            variant="subtle" 
            onClick={() => refetchJobs()}
            loading={jobsLoading}
          >
            <IconRefresh size={18} />
          </ActionIcon>
          {/* Mobile-only quick action to start recording */}
          <Button
            leftSection={<IconMicrophone size={16} />}
            onClick={() => navigate('/upload?mode=record')}
            hiddenFrom="sm"
          >
            Record Class
          </Button>
        </Group>
      </Group>
      
      {/* Quick Stats Overview */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        {stats.map((stat) => (
          <Card key={stat.title} shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  {stat.title}
                </Text>
                <Text fw={700} size="xl">
                  {stat.value}
                </Text>
              </div>
              <ThemeIcon color={stat.color} variant="light" radius="md" size={40}>
                <stat.icon size={28} stroke={1.5} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      
      <Grid gutter="lg">
        {/* Recent Recordings Widget */}
        <Grid.Col span={{ base: 12, lg: 12 }}>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Recent Recordings</Title>
              <Group>
                <Button 
                  variant="subtle" 
                  size="sm" 
                  rightSection={<IconChartBar size={16} />}
                  onClick={() => navigate('/reports')}
                >
                  View All Records
                </Button>
              </Group>
            </Group>
            
            {jobsLoading ? (
              <Group justify="center" p="xl">
                <Loader size="lg" />
                <Text c="dimmed">Loading your recordings...</Text>
              </Group>
            ) : recentJobs.length > 0 ? (
              <Stack gap="md">
                {recentJobs.map((job: TeacherJob) => {
                  const statusInfo = getStatusInfo(job);
                  return (
                    <Paper key={job.id} p="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <div style={{ flex: 1 }}>
                          <Text fw={600} size="md">
                            {job.file_name || 'Untitled Recording'}
                          </Text>
                          <Group gap="xs" mt={4}>
                            {job.class_name && (
                              <Text size="sm" fw={500} c="blue">
                                {job.class_name}
                              </Text>
                            )}
                            {job.subject && (
                              <Badge variant="outline" size="sm">
                                {job.subject}
                              </Badge>
                            )}
                            {job.grade && (
                              <Badge variant="light" size="sm" color="gray">
                                Grade {job.grade}
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed" mt={2}>
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                            {job.word_count && ` • ${job.word_count.toLocaleString()} words`}
                          </Text>
                        </div>
                        <Group gap="xs">
                          {job.has_analysis > 0 ? (
                            <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
                              {job.has_analysis === 1 ? '1 Analysis' : `${job.has_analysis} Analyses`}
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="light">
                              Not Analyzed
                            </Badge>
                          )}
                          <Badge color={statusInfo.color} variant="light">
                            {statusInfo.label}
                          </Badge>
                        </Group>
                      </Group>
                      
                      {job.status === 'completed' && job.has_analysis > 0 && (
                        <Group gap="xs" mt="md">
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconEye size={14} />}
                            onClick={() => navigate(`/reports?recording=${job.id}`)}
                          >
                            View Results
                          </Button>
                          <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<IconPlayerPlay size={14} />}
                            onClick={() => listenRecording(job)}
                          >
                            Listen
                          </Button>
                          <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<IconDownload size={14} />}
                            onClick={() => {
                              // TODO: Implement PDF download for specific recording
                              console.log('Download PDF for recording:', job.id);
                            }}
                          >
                            Download PDF
                          </Button>
                        </Group>
                      )}
                      
                      {job.status === 'completed' && (!job.has_analysis || job.has_analysis === 0) && (
                        <Group gap="xs" mt="md">
                          <Text size="xs" c="dimmed">
                            Analysis pending - your school manager will apply analysis templates
                          </Text>
                        </Group>
                      )}
                      
                      {(job.status === 'processing' || job.status === 'queued' || job.status === 'uploading') && (
                        <Progress value={statusInfo.progress} mt="xs" />
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Paper p="xl" ta="center">
                <Text c="dimmed" size="sm" mb="md">
                  No recordings yet. Your recordings will appear here once uploaded by your school manager.
                </Text>
              </Paper>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* Playback Modal */}
      <Modal
        opened={playbackModalOpened}
        onClose={() => setPlaybackModalOpened(false)}
        size="md"
        title={
          <Group>
            <IconPlayerPlay size={20} />
            <div>
              <Text fw={500}>Playback</Text>
              <Text size="sm" c="dimmed">{playbackFileName || 'Audio'}</Text>
            </div>
          </Group>
        }
      >
        {playbackUrl ? (
          <Stack>
            <audio controls style={{ width: '100%' }} src={playbackUrl} />
            <Text size="xs" c="dimmed">The link expires in a few minutes.</Text>
          </Stack>
        ) : (
          <Loader />
        )}
      </Modal>
    </Container>
  );
}
