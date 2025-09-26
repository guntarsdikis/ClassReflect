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
  ScrollArea,
  Loader,
  Alert,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconUsers,
  IconChartBar,
  IconPlus,
  IconEye,
  IconDownload,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { schoolsService } from '@features/schools/services/schools.service';
import { usersService } from '@features/users/services/users.service';
import { RecordingsService } from '@features/recordings/services/recordings.service';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);

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

  // Fetch recent recordings for super admin
  const { data: recordingsData, isLoading: recordingsLoading } = useQuery({
    queryKey: ['recordings-dashboard'],
    queryFn: () => RecordingsService.getRecordings({ limit: 10 }), // Last 10 recordings
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Handle recording download
  const handleDownload = async (jobId: string) => {
    try {
      setDownloadingJobId(jobId);

      const downloadData = await RecordingsService.downloadRecording(jobId);

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadData.downloadUrl;
      link.download = downloadData.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifications.show({
        title: 'Download Started',
        message: `Download started for ${downloadData.fileName}`,
        color: 'green',
      });
    } catch (error) {
      console.error('Download failed:', error);
      notifications.show({
        title: 'Download Failed',
        message: 'Failed to generate download link. The file may not be stored in S3.',
        color: 'red',
      });
    } finally {
      setDownloadingJobId(null);
    }
  };

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
      <Group justify="space-between" mb="xl" wrap="wrap" gap="sm">
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
          <ScrollArea>
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
              {schools.map((school, idx) => {
                const schoolTeachers = allTeachers?.filter(t => t.schoolId === school.id) || [];
                return (
                  <Table.Tr key={`school-${school.id}-${idx}`}>
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
          </ScrollArea>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">No schools available</Text>
          </div>
        )}
      </Card>

      {/* Recent Recordings Section */}
      <Card shadow="sm" p="lg" radius="md" withBorder mt="lg">
        <Group justify="space-between" mb="md">
          <Title order={3}>Recent Recordings</Title>
          <Group>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconEye size={16} />}
              onClick={() => navigate('/admin/recordings')}
            >
              View All Recordings
            </Button>
          </Group>
        </Group>

        {recordingsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader size="md" />
            <Text c="dimmed" mt="md">Loading recordings...</Text>
          </div>
        ) : recordingsData && recordingsData.recordings.length > 0 ? (
          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>File Name</Table.Th>
                  <Table.Th>Teacher</Table.Th>
                  <Table.Th>School</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recordingsData.recordings.map((recording, idx) => (
                  <Table.Tr key={`rec-${recording.id}-${idx}`}>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{recording.file_name}</Text>
                        {recording.class_name && (
                          <Text size="xs" c="dimmed">{recording.class_name}</Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{recording.teacher_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{recording.school_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={RecordingsService.getStatusColor(recording.status)}
                        variant="light"
                      >
                        {recording.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{recording.file_size_mb || 'N/A'} MB</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {format(new Date(recording.created_at), 'MMM dd, HH:mm')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => navigate(`/jobs/${recording.id}`)}
                          title="View Details"
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          onClick={() => handleDownload(recording.id)}
                          loading={downloadingJobId === recording.id}
                          title="Download Recording"
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        ) : (
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            <Text>No recordings available yet</Text>
          </Alert>
        )}
      </Card>
    </Container>
  );
}
