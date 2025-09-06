import {
  Container,
  Grid,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  Button,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Progress,
  Table,
  ActionIcon,
} from '@mantine/core';
import {
  IconUpload,
  IconUsers,
  IconFileText,
  IconClock,
  IconChartBar,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { jobsService } from '@features/jobs/services/jobs.service';
import { usersService } from '@features/users/services/users.service';
import { analysisService } from '@features/analysis/services/analysis.service';

export function ManagerDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const schoolId = user?.schoolId;

  // Fetch real data from API
  const { data: jobStats, isLoading: jobStatsLoading } = useQuery({
    queryKey: ['school-job-stats', schoolId],
    queryFn: () => jobsService.getSchoolJobStats(schoolId!),
    enabled: !!schoolId,
    refetchInterval: 30000,
  });

  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['school-teachers', schoolId],
    queryFn: () => usersService.getTeachers(schoolId),
    enabled: !!schoolId,
  });

  const { data: analysisSummary, isLoading: analysisLoading } = useQuery({
    queryKey: ['school-analysis-summary', schoolId],
    queryFn: () => analysisService.getSchoolSummary(schoolId),
    enabled: !!schoolId,
  });

  const { data: recentJobs, isLoading: recentJobsLoading } = useQuery({
    queryKey: ['recent-jobs', schoolId],
    queryFn: async () => {
      // Get recent jobs from teachers in this school
      const teacherList = await usersService.getTeachers(schoolId);
      if (teacherList.length === 0) return [];
      
      // For now, just return empty array - we'd need a school-wide recent jobs endpoint
      // This could be implemented later as jobsService.getSchoolRecentJobs(schoolId)
      return [];
    },
    enabled: !!schoolId,
  });

  // Calculate real stats
  const totalTeachers = teachers?.length || 0;
  const activeRecordings = jobStats?.processing_jobs || 0;
  const completedThisMonth = jobStats?.completed_jobs || 0;
  const averageScore = analysisSummary?.summary.average_score || 0;

  const statsCards = [
    {
      title: 'Total Teachers',
      value: totalTeachers.toString(),
      icon: IconUsers,
      color: 'blue',
      action: () => navigate('/teachers'),
    },
    {
      title: 'Active Recordings',
      value: activeRecordings.toString(),
      icon: IconClock,
      color: 'orange',
    },
    {
      title: 'Completed This Month',
      value: completedThisMonth.toString(),
      icon: IconFileText,
      color: 'green',
    },
    {
      title: 'Average Score',
      value: averageScore > 0 ? `${Math.round(averageScore)}%` : 'N/A',
      icon: IconChartBar,
      color: 'teal',
    },
  ];

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>School Manager Dashboard</Title>
          <Text c="dimmed">Welcome back, {user?.firstName}!</Text>
        </div>
        <Group>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={() => navigate('/upload')}
          >
            Upload Recording
          </Button>
          <Button
            variant="light"
            leftSection={<IconUsers size={16} />}
            onClick={() => navigate('/teachers/new')}
          >
            Add Teacher
          </Button>
        </Group>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        {statsCards.map((stat) => (
          <Card
            key={stat.title}
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            style={{ cursor: stat.action ? 'pointer' : 'default' }}
            onClick={stat.action}
          >
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
        {/* Recent Uploads */}
        <Grid.Col span={{ base: 12, lg: 12 }}>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Recent Uploads</Title>
              <Button
                variant="subtle"
                size="sm"
                rightSection={<IconEye size={16} />}
                onClick={() => navigate('/uploads')}
              >
                View All
              </Button>
            </Group>

            {recentJobsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Text c="dimmed">Loading recent uploads...</Text>
              </div>
            ) : (recentJobs && recentJobs.length > 0) ? (
              <Stack gap="md">
                {recentJobs.map((upload) => (
                  <Paper key={upload.id} p="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <div>
                        <Group gap="xs" mb={4}>
                          <Text fw={600}>{upload.teacherName}</Text>
                          <Badge size="sm" variant="dot">
                            {upload.className}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {format(upload.uploadDate, 'MMM dd, yyyy • HH:mm')} • {upload.duration}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          Template: {upload.template}
                        </Text>
                      </div>
                      {upload.status === 'completed' ? (
                        <Group gap="xs">
                          <Badge color="green" variant="light">
                            Score: {upload.score}%
                          </Badge>
                          <ActionIcon variant="subtle" color="blue">
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Group>
                      ) : (
                        <div style={{ width: 120 }}>
                          <Text size="xs" c="dimmed" mb={4}>
                            Processing: {upload.progress}%
                          </Text>
                          <Progress value={upload.progress!} size="sm" />
                        </div>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper p="xl" ta="center">
                <Text c="dimmed" size="sm">
                  No uploads yet. Start by uploading your first class recording!
                </Text>
              </Paper>
            )}

            <Button
              fullWidth
              variant="light"
              mt="md"
              leftSection={<IconUpload size={16} />}
              onClick={() => navigate('/upload')}
            >
              Upload New Recording
            </Button>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Teachers Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder mt="lg">
        <Group justify="space-between" mb="md">
          <Title order={3}>Teacher Overview</Title>
          <Group>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/teachers/new')}
            >
              Add Teacher
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => navigate('/teachers')}
            >
              Manage All
            </Button>
          </Group>
        </Group>

        {teachersLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">Loading teachers...</Text>
          </div>
        ) : teachers && teachers.length > 0 ? (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Subjects</Table.Th>
                <Table.Th>Grades</Table.Th>
                <Table.Th>Evaluations</Table.Th>
                <Table.Th>Avg Score</Table.Th>
                <Table.Th>Last Active</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {teachers.map((teacher) => (
                <Table.Tr key={teacher.id}>
                  <Table.Td>
                    <div>
                      <Text size="sm" fw={500}>{teacher.firstName} {teacher.lastName}</Text>
                      <Text size="xs" c="dimmed">{teacher.email}</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {teacher.subjects?.map((subject: string) => (
                        <Badge key={subject} size="sm" variant="light">
                          {subject}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>{teacher.grades?.join(', ') || 'N/A'}</Table.Td>
                  <Table.Td>0</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">N/A</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{teacher.lastLogin ? format(new Date(teacher.lastLogin), 'MMM dd') : 'N/A'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon variant="subtle" color="blue" onClick={() => navigate(`/teachers/${teacher.id}`)}>
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="gray">
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="red">
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Paper p="xl" ta="center">
            <Text c="dimmed" mb="md">
              No teachers added yet. Add your first teacher to get started!
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/teachers/new')}
            >
              Add First Teacher
            </Button>
          </Paper>
        )}
      </Card>
    </Container>
  );
}