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
  IconTemplate,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';

// TODO: Replace with real API calls when backend endpoints are ready
// const { data: stats, isLoading: statsLoading } = useQuery(['school-stats']);
// const { data: recentUploads, isLoading: uploadsLoading } = useQuery(['recent-uploads']);
// const { data: teachers, isLoading: teachersLoading } = useQuery(['school-teachers']);

// Placeholder stats - will be replaced with real data
const stats = {
  totalTeachers: 0,
  activeRecordings: 0,
  completedThisMonth: 0,
  averageScore: 0,
};

const recentUploads: any[] = [];
const teachers: any[] = [];

export function ManagerDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const statsCards = [
    {
      title: 'Total Teachers',
      value: stats.totalTeachers.toString(),
      icon: IconUsers,
      color: 'blue',
      action: () => navigate('/teachers'),
    },
    {
      title: 'Active Recordings',
      value: stats.activeRecordings.toString(),
      icon: IconClock,
      color: 'orange',
    },
    {
      title: 'Completed This Month',
      value: stats.completedThisMonth.toString(),
      icon: IconFileText,
      color: 'green',
    },
    {
      title: 'Average Score',
      value: stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A',
      icon: IconChartBar,
      color: 'teal',
      action: () => navigate('/analytics'),
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
        <Grid.Col span={{ base: 12, lg: 8 }}>
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

            {recentUploads.length > 0 ? (
              <Stack gap="md">
                {recentUploads.map((upload) => (
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

        {/* Quick Actions & Teachers */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          {/* Quick Actions */}
          <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
            <Title order={3} mb="md">Quick Actions</Title>
            <Stack>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconUpload size={16} />}
                onClick={() => navigate('/upload')}
              >
                Upload Recording
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconPlus size={16} />}
                onClick={() => navigate('/teachers/new')}
              >
                Add New Teacher
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconTemplate size={16} />}
                onClick={() => navigate('/templates')}
              >
                Manage Templates
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconChartBar size={16} />}
                onClick={() => navigate('/analytics')}
              >
                View Analytics
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconDownload size={16} />}
                onClick={() => navigate('/export')}
              >
                Export Reports
              </Button>
            </Stack>
          </Card>

          {/* Top Teachers */}
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Top Teachers</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => navigate('/teachers')}
              >
                View All
              </Button>
            </Group>

            {teachers.length > 0 ? (
              <Stack gap="sm">
                {teachers.slice(0, 3).map((teacher, index) => (
                  <Paper key={teacher.id} p="sm" withBorder>
                    <Group justify="space-between">
                      <div>
                        <Text size="sm" fw={500}>
                          {index + 1}. {teacher.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {teacher.evaluations} evaluations
                        </Text>
                      </div>
                      <Badge
                        color={teacher.averageScore >= 90 ? 'green' : teacher.averageScore >= 80 ? 'blue' : 'yellow'}
                        variant="light"
                      >
                        {teacher.averageScore}%
                      </Badge>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper p="md" ta="center">
                <Text c="dimmed" size="sm">
                  No teacher data available yet.
                </Text>
              </Paper>
            )}
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

        {teachers.length > 0 ? (
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
                      <Text size="sm" fw={500}>{teacher.name}</Text>
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
                  <Table.Td>{teacher.evaluations || 0}</Table.Td>
                  <Table.Td>
                    {teacher.averageScore ? (
                      <Badge
                        color={teacher.averageScore >= 90 ? 'green' : teacher.averageScore >= 80 ? 'blue' : 'yellow'}
                        variant="light"
                      >
                        {teacher.averageScore}%
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed">N/A</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{teacher.lastActive ? format(new Date(teacher.lastActive), 'MMM dd') : 'N/A'}</Text>
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