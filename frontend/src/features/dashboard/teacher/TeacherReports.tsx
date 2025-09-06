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
  Table,
  TextInput,
  Select,
  Checkbox,
  ActionIcon,
  Modal,
  Textarea,
  RangeSlider,
  Tooltip,
  Menu,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconSearch,
  IconFilter,
  IconDownload,
  IconEye,
  IconTrash,
  IconSettings,
  IconCalendar,
  IconFileText,
  IconChartBar,
  IconGitCompare,
  IconHistory,
  IconDotsVertical,
  IconCheck,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { jobsService } from '@features/jobs/services/jobs.service';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useSearchParams } from 'react-router-dom';

// Types for teacher recordings data
interface TeacherRecording {
  id: string;
  class_name: string;
  subject: string;
  grade: string;
  file_name: string;
  created_at: string;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  duration_minutes?: number;
  analysis_score?: number;
  has_analysis: number;
  analysis_count: number;
  transcript_text?: string;
  word_count?: number;
  template_name?: string;
  latest_analysis_date?: string;
}

interface FilterState {
  search: string;
  subject: string;
  grade: string;
  scoreRange: [number, number];
  dateRange: [Date | null, Date | null];
  template: string;
  status: string;
}

export function TeacherReports() {
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [detailsModalOpened, { open: openDetailsModal, close: closeDetailsModal }] = useDisclosure(false);
  const [selectedRecording, setSelectedRecording] = useState<TeacherRecording | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    subject: '',
    grade: '',
    scoreRange: [0, 100],
    dateRange: [null, null],
    template: '',
    status: '',
  });

  // Fetch teacher's recordings
  const { data: recordings, isLoading, refetch } = useQuery({
    queryKey: ['teacher-recordings', user?.id],
    queryFn: () => jobsService.getTeacherJobs(user!.id.toString()),
    enabled: !!user?.id,
  });

  // Backend returns { jobs: [...], count: N } structure
  const recordingsData = Array.isArray(recordings?.jobs) ? recordings.jobs : [];

  // Handle URL parameter to auto-open specific recording
  useEffect(() => {
    const recordingId = searchParams.get('recording');
    if (recordingId && recordingsData.length > 0) {
      const recording = recordingsData.find((r: TeacherRecording) => r.id === recordingId);
      if (recording) {
        setSelectedRecording(recording);
        openDetailsModal();
        // Clear the URL parameter after opening
        searchParams.delete('recording');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [recordingsData, searchParams, setSearchParams, openDetailsModal]);

  // Filter and search recordings
  const filteredRecordings = useMemo(() => {
    return recordingsData.filter((recording: TeacherRecording) => {
      // Text search in class name, subject, and transcript
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = `${recording.class_name} ${recording.subject} ${recording.transcript_text || ''}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }

      // Subject filter
      if (filters.subject && recording.subject !== filters.subject) return false;

      // Grade filter
      if (filters.grade && recording.grade !== filters.grade) return false;

      // Score range filter
      if (recording.analysis_score && (recording.analysis_score < filters.scoreRange[0] || recording.analysis_score > filters.scoreRange[1])) {
        return false;
      }

      // Date range filter
      if (filters.dateRange[0] && filters.dateRange[1]) {
        const uploadDate = new Date(recording.created_at);
        if (uploadDate < filters.dateRange[0] || uploadDate > filters.dateRange[1]) {
          return false;
        }
      }

      // Template filter
      if (filters.template && recording.template_name !== filters.template) return false;

      // Status filter
      if (filters.status && recording.status !== filters.status) return false;

      return true;
    });
  }, [recordingsData, filters]);

  // Get unique values for filter dropdowns - filter out null/undefined values
  const uniqueSubjects = [...new Set(recordingsData.map((r: TeacherRecording) => r.subject).filter(Boolean))];
  const uniqueGrades = [...new Set(recordingsData.map((r: TeacherRecording) => r.grade).filter(Boolean))];
  const uniqueTemplates = [...new Set(recordingsData.filter((r: TeacherRecording) => r.template_name).map((r: TeacherRecording) => r.template_name).filter(Boolean))];
  const uniqueStatuses = [...new Set(recordingsData.map((r: TeacherRecording) => r.status).filter(Boolean))];

  // Handle row selection
  const handleSelectRecording = (jobId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecordings);
    if (checked) {
      newSelected.add(jobId);
    } else {
      newSelected.delete(jobId);
    }
    setSelectedRecordings(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecordings(new Set(filteredRecordings.map((r: TeacherRecording) => r.id)));
    } else {
      setSelectedRecordings(new Set());
    }
  };

  // Export functions
  const handleExportCSV = () => {
    const recordingsToExport = selectedRecordings.size > 0 
      ? filteredRecordings.filter((r: TeacherRecording) => selectedRecordings.has(r.id))
      : filteredRecordings;

    const csvData = recordingsToExport.map((recording: TeacherRecording) => ({
      'Class Name': recording.class_name,
      'Subject': recording.subject,
      'Grade': recording.grade,
      'Upload Date': format(new Date(recording.created_at), 'yyyy-MM-dd'),
      'Duration (min)': recording.duration_minutes || 'N/A',
      'Analysis Score': recording.analysis_score || 'N/A',
      'Template Used': recording.template_name || 'N/A',
      'Status': recording.status,
      'Word Count': recording.word_count || 'N/A'
    }));

    // Create CSV content
    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teacher-recordings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notifications.show({
      title: 'Export Complete',
      message: `Exported ${csvData.length} recordings to CSV`,
      color: 'green',
    });
  };

  const handleBulkPDFExport = () => {
    const selectedCount = selectedRecordings.size;
    notifications.show({
      title: 'PDF Export Started',
      message: `Generating PDF reports for ${selectedCount} recordings...`,
      color: 'blue',
    });
    // TODO: Implement bulk PDF export
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      subject: '',
      grade: '',
      scoreRange: [0, 100],
      dateRange: [null, null],
      template: '',
      status: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { color: 'green', label: 'Completed' },
      'processing': { color: 'orange', label: 'Processing' },
      'queued': { color: 'yellow', label: 'Queued' },
      'uploading': { color: 'blue', label: 'Uploading' },
      'pending': { color: 'blue', label: 'Pending' },
      'failed': { color: 'red', label: 'Failed' },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'gray', label: status };
    return <Badge color={config.color} variant="light" size="sm">{config.label}</Badge>;
  };

  return (
    <Container size="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>My Recordings</Title>
          <Text c="dimmed" size="sm">
            View all your recordings, analysis results, and download reports
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleExportCSV}
            disabled={filteredRecordings.length === 0}
          >
            Export CSV
          </Button>
        </Group>
      </Group>

      {/* All Recordings Section */}
      <div>
          {/* Advanced Filtering */}
          <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
            <Title order={4} mb="md">Advanced Filtering & Search</Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <TextInput
                  placeholder="Search recordings, transcripts..."
                  leftSection={<IconSearch size={16} />}
                  value={filters.search}
                  onChange={(event) => setFilters(prev => ({ ...prev, search: event.currentTarget.value }))}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Subject"
                  data={uniqueSubjects}
                  value={filters.subject}
                  onChange={(value) => setFilters(prev => ({ ...prev, subject: value || '' }))}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Grade"
                  data={uniqueGrades}
                  value={filters.grade}
                  onChange={(value) => setFilters(prev => ({ ...prev, grade: value || '' }))}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Template"
                  data={uniqueTemplates}
                  value={filters.template}
                  onChange={(value) => setFilters(prev => ({ ...prev, template: value || '' }))}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Status"
                  data={uniqueStatuses}
                  value={filters.status}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 1 }}>
                <Button variant="subtle" onClick={clearFilters} fullWidth>
                  Clear
                </Button>
              </Grid.Col>
            </Grid>

            <Grid mt="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" mb={5}>Score Range: {filters.scoreRange[0]}% - {filters.scoreRange[1]}%</Text>
                <RangeSlider
                  value={filters.scoreRange}
                  onChange={(value) => setFilters(prev => ({ ...prev, scoreRange: value }))}
                  min={0}
                  max={100}
                  step={5}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" mb={5}>Date Range</Text>
                <Group>
                  <DatePickerInput
                    placeholder="From"
                    value={filters.dateRange[0]}
                    onChange={(value) => setFilters(prev => ({ ...prev, dateRange: [value, prev.dateRange[1]] }))}
                    size="sm"
                  />
                  <DatePickerInput
                    placeholder="To"
                    value={filters.dateRange[1]}
                    onChange={(value) => setFilters(prev => ({ ...prev, dateRange: [prev.dateRange[0], value] }))}
                    size="sm"
                  />
                </Group>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Bulk Actions */}
          {selectedRecordings.size > 0 && (
            <Card shadow="sm" p="md" radius="md" withBorder mb="lg" bg="blue.0">
              <Group justify="space-between">
                <Text fw={500}>
                  {selectedRecordings.size} recording{selectedRecordings.size > 1 ? 's' : ''} selected
                </Text>
                <Group>
                  <Button size="sm" variant="light" onClick={handleBulkPDFExport}>
                    Export PDFs
                  </Button>
                  <Button size="sm" variant="light" onClick={handleExportCSV}>
                    Export CSV
                  </Button>
                </Group>
              </Group>
            </Card>
          )}

          {/* Recordings Table */}
          <Card shadow="sm" radius="md" withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Checkbox
                      checked={selectedRecordings.size === filteredRecordings.length && filteredRecordings.length > 0}
                      indeterminate={selectedRecordings.size > 0 && selectedRecordings.size < filteredRecordings.length}
                      onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                    />
                  </Table.Th>
                  <Table.Th>Recording</Table.Th>
                  <Table.Th>Class Info</Table.Th>
                  <Table.Th>Transcript</Table.Th>
                  <Table.Th>Analysis Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading recordings...
                    </Table.Td>
                  </Table.Tr>
                ) : filteredRecordings.length > 0 ? (
                  filteredRecordings.map((recording: TeacherRecording) => (
                    <Table.Tr key={recording.id}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedRecordings.has(recording.id)}
                          onChange={(event) => handleSelectRecording(recording.id, event.currentTarget.checked)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>{recording.file_name}</Text>
                          <Text size="xs" c="dimmed">{format(new Date(recording.created_at), 'MMM dd, yyyy h:mm a')}</Text>
                          {getStatusBadge(recording.status)}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>{recording.class_name || 'Untitled Class'}</Text>
                          <Group gap="xs" mt={2}>
                            {recording.subject && <Badge variant="light" size="sm">{recording.subject}</Badge>}
                            {recording.grade && <Badge variant="outline" size="sm">Grade {recording.grade}</Badge>}
                          </Group>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Text size="sm">{recording.word_count ? `${recording.word_count.toLocaleString()} words` : 'No transcript'}</Text>
                          {recording.word_count && (
                            <Text size="xs" c="dimmed">High Quality</Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        {recording.has_analysis > 0 ? (
                          <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
                            {recording.has_analysis === 1 ? '1 Analysis' : `${recording.has_analysis} Analyses`}
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light">
                            Not Analyzed
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="View Details">
                            <ActionIcon
                              variant="subtle"
                              onClick={() => {
                                setSelectedRecording(recording);
                                openDetailsModal();
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {recording.has_analysis > 0 && (
                            <Tooltip label="Download PDF">
                              <ActionIcon variant="subtle">
                                <IconDownload size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Menu withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item leftSection={<IconEye size={14} />}>
                                View Analysis
                              </Menu.Item>
                              <Menu.Item leftSection={<IconDownload size={14} />}>
                                Export PDF
                              </Menu.Item>
                              <Menu.Item leftSection={<IconGitCompare size={14} />} disabled>
                                Compare (Coming Soon)
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Text c="dimmed" mb="sm">No recordings match your current filters.</Text>
                      {Object.values(filters).some(v => v && v.length > 0) && (
                        <Button variant="subtle" mt="sm" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Card>
      </div>

      {/* Recording Details Modal */}
      <Modal
        opened={detailsModalOpened}
        onClose={closeDetailsModal}
        title="Recording Details"
        size="lg"
      >
        {selectedRecording && (
          <Stack>
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Class Name</Text>
                <Text fw={500}>{selectedRecording.class_name}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Subject & Grade</Text>
                <Text fw={500}>{selectedRecording.subject} - Grade {selectedRecording.grade}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Upload Date</Text>
                <Text fw={500}>{format(new Date(selectedRecording.created_at), 'MMM dd, yyyy h:mm a')}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Status</Text>
                {getStatusBadge(selectedRecording.status)}
              </Grid.Col>
              {selectedRecording.duration_minutes && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Duration</Text>
                  <Text fw={500}>{selectedRecording.duration_minutes} minutes</Text>
                </Grid.Col>
              )}
              {selectedRecording.analysis_score && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Analysis Score</Text>
                  <Text fw={500} c="teal">{selectedRecording.analysis_score}%</Text>
                </Grid.Col>
              )}
            </Grid>
            
            {selectedRecording.transcript_text && (
              <>
                <Text size="sm" c="dimmed" mt="md">Transcript Preview</Text>
                <Paper p="md" bg="gray.0" radius="sm">
                  <Text size="sm" style={{ maxHeight: 200, overflow: 'auto' }}>
                    {selectedRecording.transcript_text.substring(0, 500)}
                    {selectedRecording.transcript_text.length > 500 && '...'}
                  </Text>
                </Paper>
              </>
            )}

            <Group mt="lg">
              {selectedRecording.has_analysis > 0 && (
                <Button leftSection={<IconEye size={16} />}>
                  View Full Analysis
                </Button>
              )}
              <Button variant="light" leftSection={<IconDownload size={16} />}>
                Export PDF
              </Button>
              <Button variant="subtle" onClick={closeDetailsModal}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}