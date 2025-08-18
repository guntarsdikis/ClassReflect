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
  rem,
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

// Mock data for development
const mockStats = {
  totalTeachers: 12,
  activeRecordings: 3,
  completedThisMonth: 28,
  averageScore: 84,
};

const mockRecentUploads = [
  {
    id: '1',
    teacherName: 'Sarah Johnson',
    className: 'Math Class - Grade 3',
    uploadDate: new Date('2024-10-25T10:30:00'),
    status: 'completed',
    duration: '45 min',
    score: 85,
    template: 'K-12 Math Assessment',
  },
  {
    id: '2',
    teacherName: 'John Smith',
    className: 'Science Lab - Grade 5',
    uploadDate: new Date('2024-10-25T09:15:00'),
    status: 'processing',
    duration: '50 min',
    progress: 65,
    template: 'Science Inquiry Template',
  },
  {
    id: '3',
    teacherName: 'Emily Brown',
    className: 'English Literature',
    uploadDate: new Date('2024-10-24T14:20:00'),
    status: 'completed',
    duration: '40 min',
    score: 92,
    template: 'Language Arts Standard',
  },
];

const mockTeachers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@school.edu',
    subjects: ['Math', 'Science'],
    grades: ['3', '4'],
    evaluations: 8,
    averageScore: 87,
    lastActive: new Date('2024-10-25'),
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john.smith@school.edu',
    subjects: ['Science'],
    grades: ['5', '6'],
    evaluations: 5,
    averageScore: 82,
    lastActive: new Date('2024-10-25'),
  },
  {
    id: '3',
    name: 'Emily Brown',
    email: 'emily.brown@school.edu',
    subjects: ['English', 'History'],
    grades: ['7', '8'],
    evaluations: 10,
    averageScore: 91,
    lastActive: new Date('2024-10-24'),
  },
];

export function ManagerDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const stats = [
    {
      title: 'Total Teachers',
      value: mockStats.totalTeachers.toString(),
      icon: IconUsers,
      color: 'blue',
      action: () => navigate('/teachers'),
    },
    {
      title: 'Active Recordings',
      value: mockStats.activeRecordings.toString(),
      icon: IconClock,
      color: 'orange',
    },
    {
      title: 'Completed This Month',
      value: mockStats.completedThisMonth.toString(),
      icon: IconFileText,
      color: 'green',
    },
    {
      title: 'Average Score',
      value: `${mockStats.averageScore}%`,
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
        {stats.map((stat) => (
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
              <ThemeIcon color={stat.color} variant="light" radius="md" size="xl">
                <stat.icon size={rem(28)} stroke={1.5} />
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

            <Stack gap="md">
              {mockRecentUploads.map((upload) => (
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

            <Stack gap="sm">
              {mockTeachers.slice(0, 3).map((teacher, index) => (
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
            {mockTeachers.map((teacher) => (
              <Table.Tr key={teacher.id}>
                <Table.Td>
                  <div>
                    <Text size="sm" fw={500}>{teacher.name}</Text>
                    <Text size="xs" c="dimmed">{teacher.email}</Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {teacher.subjects.map((subject) => (
                      <Badge key={subject} size="sm" variant="light">
                        {subject}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>{teacher.grades.join(', ')}</Table.Td>
                <Table.Td>{teacher.evaluations}</Table.Td>
                <Table.Td>
                  <Badge
                    color={teacher.averageScore >= 90 ? 'green' : teacher.averageScore >= 80 ? 'blue' : 'yellow'}
                    variant="light"
                  >
                    {teacher.averageScore}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{format(teacher.lastActive, 'MMM dd')}</Text>
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
      </Card>
    </Container>
  );
}