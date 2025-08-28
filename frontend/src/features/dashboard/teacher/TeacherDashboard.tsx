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
} from '@mantine/core';
import {
  IconFileText,
  IconTrendingUp,
  IconClock,
  IconStar,
  IconEye,
  IconDownload,
  IconChartBar,
} from '@tabler/icons-react';
// import { useQuery } from '@tanstack/react-query';
// import { api } from '@shared/services/api.client';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';

// TODO: Replace with real API calls when backend endpoints are ready
// const { data: evaluations, isLoading: evaluationsLoading } = useQuery(['teacher-evaluations']);
// const { data: progress, isLoading: progressLoading } = useQuery(['teacher-progress']);

// Placeholder data - will be replaced with real data
const recentEvaluations: any[] = [];
const progress = {};

export function TeacherDashboard() {
  const user = useAuthStore((state) => state.user);
  
  // In real app, fetch data with React Query
  // const { data: evaluations, isLoading } = useQuery({
  //   queryKey: ['teacher-evaluations', user?.id],
  //   queryFn: () => api.jobs.getTeacherJobs(user!.id),
  // });
  
  const stats = [
    {
      title: 'Total Evaluations',
      value: '0',
      icon: IconFileText,
      color: 'blue',
    },
    {
      title: 'Average Score',
      value: 'N/A',
      icon: IconStar,
      color: 'yellow',
    },
    {
      title: 'This Month',
      value: '0',
      icon: IconClock,
      color: 'green',
    },
    {
      title: 'Improvement',
      value: 'N/A',
      icon: IconTrendingUp,
      color: 'teal',
    },
  ];
  
  return (
    <Container size="xl">
      <Title order={1} mb="xl">
        Welcome back, {user?.firstName}!
      </Title>
      
      {/* Stats Cards */}
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
        {/* Recent Evaluations */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Recent Evaluations</Title>
              <Button variant="subtle" size="sm" rightSection={<IconChartBar size={16} />}>
                View All
              </Button>
            </Group>
            
            {recentEvaluations.length > 0 ? (
              <Stack gap="md">
                {recentEvaluations.map((evaluation) => (
                  <Paper key={evaluation.id} p="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <div>
                        <Text fw={600}>{evaluation.className}</Text>
                        <Text size="sm" c="dimmed">
                          {format(evaluation.date, 'MMM dd, yyyy')} • Uploaded by {evaluation.uploadedBy}
                        </Text>
                      </div>
                      {evaluation.status === 'completed' ? (
                        <Badge color="green" variant="light">
                          Score: {evaluation.score}%
                        </Badge>
                      ) : (
                        <Badge color="blue" variant="light">
                          Processing: {evaluation.progress}%
                        </Badge>
                      )}
                    </Group>
                    
                    {evaluation.status === 'completed' && (
                      <>
                        <Text size="sm" mt="xs" c="dimmed">
                          {evaluation.feedback}
                        </Text>
                        <Group gap="xs" mt="md">
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconEye size={14} />}
                          >
                            View Feedback
                          </Button>
                          <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<IconDownload size={14} />}
                          >
                            Export Report
                          </Button>
                        </Group>
                      </>
                    )}
                    
                    {evaluation.status === 'processing' && (
                      <Progress value={evaluation.progress!} mt="xs" />
                    )}
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper p="xl" ta="center">
                <Text c="dimmed" size="sm" mb="md">
                  No evaluations yet. Your class evaluations will appear here once uploaded and processed.
                </Text>
                <Text c="dimmed" size="xs">
                  Coming soon: View your teaching performance feedback and improvement suggestions.
                </Text>
              </Paper>
            )}
          </Card>
        </Grid.Col>
        
        {/* Progress Overview */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Title order={3} mb="md">Your Progress This Month</Title>
            
            {Object.keys(progress).length > 0 ? (
              <Stack gap="lg">
                {Object.entries(progress).map(([key, data]: [string, any]) => (
                  <div key={key}>
                    <Group justify="space-between" mb={5}>
                      <Text size="sm" fw={500} tt="capitalize">
                        {key}
                      </Text>
                      <Group gap={5}>
                        <Text size="sm" fw={600}>
                          {data.current}%
                        </Text>
                        <Badge
                          size="sm"
                          color={data.change >= 0 ? 'green' : 'red'}
                          variant="light"
                        >
                          {data.change >= 0 ? '+' : ''}{data.change}%
                        </Badge>
                      </Group>
                    </Group>
                    <Progress value={data.current} size="lg" />
                  </div>
                ))}
              </Stack>
            ) : (
              <Paper p="xl" ta="center">
                <Text c="dimmed" size="sm" mb="md">
                  Your teaching progress analytics will appear here.
                </Text>
                <Text c="dimmed" size="xs">
                  Coming soon: Track your improvement in engagement, clarity, classroom management, and assessment techniques.
                </Text>
              </Paper>
            )}
            
            <Button fullWidth mt="xl" variant="light">
              View Detailed Analytics
            </Button>
          </Card>
          
          {/* Quick Actions */}
          <Card shadow="sm" p="lg" radius="md" withBorder mt="lg">
            <Title order={3} mb="md">Quick Actions</Title>
            
            <Stack>
              <Button variant="subtle" justify="space-between" rightSection={<IconChartBar size={16} />}>
                View Progress Report
              </Button>
              <Button variant="subtle" justify="space-between" rightSection={<IconDownload size={16} />}>
                Export Monthly Summary
              </Button>
              <Button variant="subtle" justify="space-between" rightSection={<IconFileText size={16} />}>
                Learning Resources
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}