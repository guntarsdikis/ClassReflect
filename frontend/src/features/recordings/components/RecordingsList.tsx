import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  Button,
  Table,
  ActionIcon,
  TextInput,
  Select,
  Pagination,
  Modal,
  ScrollArea,
  Loader,
  Alert,
  Grid,
  Paper,
} from '@mantine/core';
import {
  IconSearch,
  IconEye,
  IconRefresh,
  IconFileText,
  IconClock,
  IconUser,
  IconSchool,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuthStore } from '@store/auth.store';
import { RecordingsService, type Recording, type RecordingsFilters } from '../services/recordings.service';

const ITEMS_PER_PAGE = 20;

export function RecordingsList() {
  const user = useAuthStore((state) => state.user);
  const [filters, setFilters] = useState<RecordingsFilters>({
    limit: ITEMS_PER_PAGE,
    offset: 0,
  });
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [transcriptModalOpened, setTranscriptModalOpened] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Query for recordings list
  const {
    data: recordingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['recordings', filters],
    queryFn: () => RecordingsService.getRecordings(filters),
    refetchInterval: 10000, // Refresh every 10 seconds to show processing updates
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof RecordingsFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset to first page when filtering
    }));
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * ITEMS_PER_PAGE;
    setFilters(prev => ({ ...prev, offset: newOffset }));
    setCurrentPage(page);
  };

  // Handle transcript viewing
  const viewTranscript = (recording: Recording) => {
    setSelectedRecording(recording);
    setTranscriptModalOpened(true);
  };

  const totalPages = recordingsData ? Math.ceil(recordingsData.total / ITEMS_PER_PAGE) : 0;

  if (error) {
    return (
      <Container size="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading recordings"
          color="red"
          mt="xl"
        >
          Failed to load recordings. Please try again.
          <Button variant="light" size="sm" mt="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>
            {user?.role === 'super_admin' ? 'All Recordings' : 'School Recordings'}
          </Title>
          <Text c="dimmed">
            {user?.role === 'super_admin' 
              ? 'Manage all recordings across all schools'
              : 'View and manage recordings from your school'
            }
          </Text>
        </div>
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={() => refetch()}
          loading={isLoading}
        >
          Refresh
        </Button>
      </Group>

      {/* Stats Cards */}
      {recordingsData && (
        <Grid gutter="md" mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Group>
                <IconFileText size={20} color="blue" />
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Total Recordings
                  </Text>
                  <Text fw={700} size="xl">
                    {recordingsData.total}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Group>
                <IconClock size={20} color="orange" />
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Processing
                  </Text>
                  <Text fw={700} size="xl">
                    {recordingsData.recordings.filter(r => ['queued', 'processing'].includes(r.status)).length}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Group>
                <IconFileText size={20} color="green" />
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Completed
                  </Text>
                  <Text fw={700} size="xl">
                    {recordingsData.recordings.filter(r => r.status === 'completed').length}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Group>
                <IconAlertCircle size={20} color="red" />
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Failed
                  </Text>
                  <Text fw={700} size="xl">
                    {recordingsData.recordings.filter(r => r.status === 'failed').length}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>
      )}

      {/* Filters */}
      <Card shadow="sm" p="md" radius="md" withBorder mb="lg">
        <Group>
          <TextInput
            placeholder="Search by teacher name or file name..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
          />
          <Select
            placeholder="Filter by status"
            data={[
              { value: '', label: 'All Statuses' },
              { value: 'completed', label: 'Completed' },
              { value: 'processing', label: 'Processing' },
              { value: 'queued', label: 'Queued' },
              { value: 'failed', label: 'Failed' },
              { value: 'pending', label: 'Pending' },
            ]}
            value={filters.status || ''}
            onChange={(value) => handleFilterChange('status', value || undefined)}
            w={150}
          />
        </Group>
      </Card>

      {/* Recordings Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader size="md" />
            <Text mt="md" c="dimmed">Loading recordings...</Text>
          </div>
        ) : recordingsData?.recordings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">No recordings found.</Text>
          </div>
        ) : (
          <>
            <ScrollArea>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>File & Teacher</Table.Th>
                    <Table.Th>School</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Upload Date</Table.Th>
                    <Table.Th>Processing Time</Table.Th>
                    <Table.Th>Transcript</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recordingsData?.recordings.map((recording) => (
                    <Table.Tr key={recording.id}>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500} mb={2}>
                            {recording.file_name}
                          </Text>
                          <Group gap="xs">
                            <IconUser size={14} />
                            <Text size="xs" c="dimmed">
                              {recording.teacher_name}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {recording.file_size_mb} MB
                          </Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconSchool size={14} />
                          <Text size="sm">{recording.school_name}</Text>
                        </Group>
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
                        <Text size="sm">
                          {format(new Date(recording.created_at), 'MMM dd, yyyy')}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {format(new Date(recording.created_at), 'HH:mm')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {RecordingsService.formatProcessingTime(
                            recording.processing_started_at,
                            recording.processing_completed_at
                          )}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {recording.has_transcript ? (
                          <Group gap="xs">
                            <Badge color="green" variant="light" size="sm">
                              ✓ Available
                            </Badge>
                            {recording.word_count && (
                              <Text size="xs" c="dimmed">
                                {recording.word_count} words
                              </Text>
                            )}
                          </Group>
                        ) : (
                          <Badge color="gray" variant="light" size="sm">
                            Not available
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {recording.has_transcript && (
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => viewTranscript(recording)}
                              title="View transcript"
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <Group justify="center" mt="lg">
                <Pagination
                  value={currentPage}
                  onChange={handlePageChange}
                  total={totalPages}
                  size="sm"
                />
              </Group>
            )}
          </>
        )}
      </Card>

      {/* Transcript Modal */}
      <Modal
        opened={transcriptModalOpened}
        onClose={() => setTranscriptModalOpened(false)}
        size="lg"
        title={
          <Group>
            <IconFileText size={20} />
            <div>
              <Text fw={500}>Transcript</Text>
              <Text size="sm" c="dimmed">
                {selectedRecording?.file_name} by {selectedRecording?.teacher_name}
              </Text>
            </div>
          </Group>
        }
      >
        {selectedRecording && (
          <Stack>
            {/* Transcript Info */}
            <Group>
              <Badge color="green" variant="light">
                {selectedRecording.word_count} words
              </Badge>
              {selectedRecording.confidence_score && (
                <Badge color="blue" variant="light">
                  {Math.round(selectedRecording.confidence_score * 100)}% confidence
                </Badge>
              )}
            </Group>

            {/* Transcript Text */}
            <Card p="md" withBorder style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {selectedRecording.transcript_text || 'No transcript text available.'}
              </Text>
            </Card>

            {/* Actions */}
            <Group justify="flex-end">
              <Button onClick={() => setTranscriptModalOpened(false)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}