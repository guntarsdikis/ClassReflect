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
  SimpleGrid,
  ThemeIcon,
  Table,
  ActionIcon,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconUsers,
  IconChartBar,
  IconPlus,
  IconEye,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { schoolsService } from '@features/schools/services/schools.service';
import { usersService } from '@features/users/services/users.service';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Fetch real data from API
  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ['all-schools'],
    queryFn: () => schoolsService.getAllSchools(),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: allTeachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['all-teachers'],
    queryFn: () => usersService.getTeachers(), // No schoolId = all teachers
  });

  // Calculate real stats
  const totalSchools = schools?.length || 0;
  const totalUsers = allTeachers?.length || 0;
  
  const stats = [
    {
      title: 'Total Schools',
      value: totalSchools.toString(),
      icon: IconBuildingBank,
      color: 'blue',
      action: () => navigate('/admin/schools'),
    },
    {
      title: 'Total Users',
      value: totalUsers.toString(),
      icon: IconUsers,
      color: 'green',
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Active Schools',
      value: schools?.filter(school => school.status === 'active').length.toString() || '0',
      icon: IconChartBar,
      color: 'teal',
    },
  ];


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
        <Grid.Col span={{ base: 12, lg: 12 }}>
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

        {schoolsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">Loading schools...</Text>
          </div>
        ) : schools && schools.length > 0 ? (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>School Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Teachers</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {schools.map((school) => {
                const schoolTeachers = allTeachers?.filter(t => t.schoolId === school.id) || [];
                return (
                  <Table.Tr key={school.id}>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{school.name}</Text>
                        <Text size="xs" c="dimmed">{school.address}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={school.status === 'active' ? 'green' : 'gray'} 
                        variant="light"
                      >
                        {school.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{schoolTeachers.length}</Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {school.createdAt ? format(new Date(school.createdAt), 'MMM dd, yyyy') : 'N/A'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon 
                          variant="subtle" 
                          color="blue" 
                          onClick={() => navigate(`/admin/schools/${school.id}`)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">No schools available</Text>
          </div>
        )}
      </Card>
    </Container>
  );
}