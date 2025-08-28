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
  IconBuildingBank,
  IconUsers,
  IconChartBar,
  IconClock,
  IconTemplate,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconSettings,
  IconShield,
  IconDatabase,
  IconCloudUpload,
  IconFileText,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';


export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const stats = [
    {
      title: 'Total Schools',
      value: '0',
      icon: IconBuildingBank,
      color: 'blue',
      action: () => navigate('/admin/schools'),
    },
    {
      title: 'Total Users',
      value: '0',
      icon: IconUsers,
      color: 'green',
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Monthly Revenue',
      value: '$0',
      icon: IconChartBar,
      color: 'teal',
      action: () => navigate('/admin/analytics'),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'trial': return 'blue';
      case 'expired': return 'red';
      case 'suspended': return 'yellow';
      default: return 'gray';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'school_created': return IconBuildingBank;
      case 'subscription_expired': return IconClock;
      case 'user_created': return IconUsers;
      default: return IconSettings;
    }
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Super Admin Dashboard</Title>
          <Text c="dimmed">Platform Management & Analytics</Text>
        </div>
        <Group>
          <Button
            leftSection={<IconBuildingBank size={16} />}
            onClick={() => navigate('/admin/schools/new')}
          >
            Create School
          </Button>
          <Button
            variant="light"
            leftSection={<IconUsers size={16} />}
            onClick={() => navigate('/admin/users/new')}
          >
            Add Manager
          </Button>
        </Group>
      </Group>

      {/* Platform Stats Cards */}
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
              <ThemeIcon color={stat.color} variant="light" radius="md" size={40}>
                <stat.icon size={28} stroke={1.5} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Grid gutter="lg">
        {/* Recent Activity */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Recent Platform Activity</Title>
              <Button
                variant="subtle"
                size="sm"
                rightSection={<IconEye size={16} />}
                onClick={() => navigate('/admin/activity')}
              >
                View All
              </Button>
            </Group>

            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Text c="dimmed">No recent activity</Text>
            </div>

            <Button
              fullWidth
              variant="light"
              mt="md"
              leftSection={<IconEye size={16} />}
              onClick={() => navigate('/admin/activity')}
            >
              View All Activity
            </Button>
          </Card>
        </Grid.Col>

        {/* System Operations & Quick Actions */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          {/* System Operations */}
          <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
            <Title order={3} mb="md">System Operations</Title>
            <Stack>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconDatabase size={16} />}
                onClick={() => navigate('/admin/system')}
              >
                Database Status
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconFileText size={16} />}
                onClick={() => navigate('/admin/recordings')}
              >
                All Recordings
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconCloudUpload size={16} />}
                onClick={() => navigate('/admin/processing')}
              >
                Processing Queue
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconUsers size={16} />}
                onClick={() => navigate('/admin/users')}
              >
                Manage Users
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconShield size={16} />}
                onClick={() => navigate('/admin/security')}
              >
                Security Logs
              </Button>
              <Button
                variant="subtle"
                justify="space-between"
                rightSection={<IconTemplate size={16} />}
                onClick={() => navigate('/admin/templates')}
              >
                Global Templates
              </Button>
            </Stack>
          </Card>

          {/* Top Schools */}
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Top Performing Schools</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => navigate('/admin/schools')}
              >
                View All
              </Button>
            </Group>

            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Text c="dimmed">No schools available</Text>
            </div>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Schools Overview Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder mt="lg">
        <Group justify="space-between" mb="md">
          <Title order={3}>Schools Overview</Title>
          <Group>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/admin/schools/new')}
            >
              Create School
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => navigate('/admin/schools')}
            >
              Manage All
            </Button>
          </Group>
        </Group>

        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Text c="dimmed">No schools available</Text>
        </div>
      </Card>
    </Container>
  );
}