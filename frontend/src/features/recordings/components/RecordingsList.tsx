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
  RangeSlider,
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
  IconTrash,
  IconCheck,
  IconBook,
  IconHash,
  IconChalkboard,
  IconPlayerPlay,
  IconTemplate,
  IconChartBar,
  IconMicrophone,
  IconUpload,
  IconDownload,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import { useAuthStore } from '@store/auth.store';
import { RecordingsService, type Recording, type RecordingsFilters } from '../services/recordings.service';
import { schoolsService } from '@features/schools/services/schools.service';
import { templatesService, type Template } from '@features/templates/services/templates.service';
import { analysisService, type AnalysisResult } from '@features/analysis/services/analysis.service';
import { AnalysisResults } from '@features/analysis/components/AnalysisResults';
import { AnalysisReportPDF } from '@features/analysis/components/AnalysisReportPDF';
import { pdf } from '@react-pdf/renderer';
import { useNavigate } from 'react-router-dom';
import { useSchoolContextStore } from '@store/school-context.store';

const ITEMS_PER_PAGE = 20;

export function RecordingsList() {
  const user = useAuthStore((state) => state.user);
  const { selectedSchool } = useSchoolContextStore();
  const navigate = useNavigate();
  
  // Determine which school ID to use for filtering
  const getEffectiveSchoolId = () => {
    if (user?.role === 'super_admin') {
      return selectedSchool?.id || null;
    }
    return user?.schoolId || null;
  };
  
  const [filters, setFilters] = useState<RecordingsFilters>({
    limit: ITEMS_PER_PAGE,
    offset: 0,
    schoolId: getEffectiveSchoolId(),
  });
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [transcriptModalOpened, setTranscriptModalOpened] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [playbackModalOpened, setPlaybackModalOpened] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackFileName, setPlaybackFileName] = useState<string | null>(null);
  const [applyModalOpened, setApplyModalOpened] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [resultsModalOpened, setResultsModalOpened] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analysisSelectionModalOpened, setAnalysisSelectionModalOpened] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);

  const handleDownloadPDF = async (analysis: AnalysisResult) => {
    try {
      const doc = <AnalysisReportPDF analysis={analysis} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      const className = (analysis.class_name || 'analysis').replace(/[^a-zA-Z0-9]/g, '_');
      const templateName = (analysis.template_name || 'template').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `ClassReflect_${className}_${templateName}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      notifications.show({
        title: 'Download Failed',
        message: 'Could not generate PDF report. Please try again.',
        color: 'red',
      });
    }
  };

  // Query for schools list (super admin only)
  const {
    data: schoolsData,
  } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolsService.getAllSchools(),
    enabled: user?.role === 'super_admin',
  });

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

  // Update filters when school context changes for super admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      const effectiveSchoolId = getEffectiveSchoolId();
      setFilters(prev => ({
        ...prev,
        schoolId: effectiveSchoolId,
        offset: 0,
      }));
      setCurrentPage(1);
    }
  }, [selectedSchool, user?.role]);

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

  const retranscribe = async (recording: Recording) => {
    try {
      const resp = await RecordingsService.retranscribe(recording.id);
      notifications.show({ title: 'Re-transcription Started', message: resp.message, color: 'green', icon: <IconCheck /> });
      await refetch();
    } catch (e: any) {
      notifications.show({ title: 'Failed to Start', message: e?.response?.data?.error || e?.message || 'Could not start re-transcription', color: 'red' });
    }
  };

  const listenRecording = async (recording: Recording) => {
    try {
      const data = await RecordingsService.getPlaybackUrl(recording.id);
      setPlaybackUrl(data.url);
      setPlaybackFileName(data.fileName);
      setPlaybackModalOpened(true);
    } catch (e: any) {
      notifications.show({ title: 'Playback Error', message: e?.message || 'Unable to get audio URL', color: 'red' });
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const schoolId = getEffectiveSchoolId();
      const data = await templatesService.getTemplates({ school_id: schoolId || undefined });
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load templates:', e);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openApplyTemplate = async (recording: Recording) => {
    if (!recording.transcript_id) {
      notifications.show({ title: 'No Transcript', message: 'Transcript not available for this recording yet.', color: 'orange' });
      return;
    }
    setSelectedRecording(recording);
    setSelectedTemplateId('');
    await loadTemplates();
    setApplyModalOpened(true);
  };

  const applyTemplate = async () => {
    if (!selectedRecording || !selectedRecording.transcript_id || !selectedTemplateId) return;
    try {
      const resp = await analysisService.applyTemplate({ transcriptId: selectedRecording.transcript_id, templateId: parseInt(selectedTemplateId, 10) });
      notifications.show({ title: 'Analysis Queued', message: 'Template analysis started in background.', color: 'green', icon: <IconCheck /> });
      setApplyModalOpened(false);
      // Optional: poll or refresh list
    } catch (e: any) {
      notifications.show({ title: 'Failed to Start Analysis', message: e?.message || 'Error applying template', color: 'red' });
    }
  };

  const viewAnalysis = async (recording: Recording) => {
    try {
      if (!recording.transcript_id) {
        notifications.show({ title: 'No Transcript', message: 'Transcript not available for this recording yet.', color: 'orange' });
        return;
      }
      const results = await analysisService.getAnalysisResults(recording.transcript_id);
      setSelectedRecording(recording);
      setAnalysisResults(results);
      if (results.length > 1) {
        setAnalysisSelectionModalOpened(true);
      } else {
        setSelectedAnalysis(results[0] || null);
        setResultsModalOpened(true);
      }
    } catch (e: any) {
      notifications.show({ title: 'Error', message: 'Failed to load analysis results', color: 'red' });
    }
  };

  const handleSelectAnalysis = (analysis: AnalysisResult) => {
    setSelectedAnalysis(analysis);
    setAnalysisSelectionModalOpened(false);
    setResultsModalOpened(true);
  };

  // Extra filters (advanced) - derived unique values
  const [extraFilters, setExtraFilters] = useState<{ subject: string; grade: string; scoreRange: [number, number]; dateFrom: Date | null; dateTo: Date | null; }>(
    { subject: '', grade: '', scoreRange: [0, 100], dateFrom: null, dateTo: null }
  );
  const uniqueSubjects = Array.from(new Set((recordingsData?.recordings || []).map(r => r.subject).filter(Boolean))) as string[];
  const uniqueGrades = Array.from(new Set((recordingsData?.recordings || []).map(r => r.grade).filter(Boolean))) as string[];
  const filteredRecords = (recordingsData?.recordings || []).filter((r) => {
    if (extraFilters.subject && r.subject !== extraFilters.subject) return false;
    if (extraFilters.grade && r.grade !== extraFilters.grade) return false;
    // Score filter
    const rawScore = (r as any).latest_score;
    const score = rawScore !== undefined && rawScore !== null ? Number(rawScore) : undefined;
    if (score !== undefined && !Number.isNaN(score)) {
      if (score < extraFilters.scoreRange[0] || score > extraFilters.scoreRange[1]) return false;
    }
    // Date filter
    const from = extraFilters.dateFrom;
    const to = extraFilters.dateTo;
    if (from && new Date(r.created_at) < from) return false;
    if (to) {
      const end = new Date(to); end.setHours(23,59,59,999);
      if (new Date(r.created_at) > end) return false;
    }
    return true;
  });

  // Handle recording deletion
  const handleDeleteRecording = async (recording: Recording) => {
    // Only allow school managers and super admins to delete recordings
    if (!['school_manager', 'super_admin'].includes(user?.role || '')) {
      notifications.show({
        title: 'Access Denied',
        message: 'You do not have permission to delete recordings',
        color: 'red',
      });
      return;
    }

    // Confirm deletion with detailed warning
    const confirmed = window.confirm(
      `Are you sure you want to delete this recording?\n\n` +
      `File: ${recording.file_name}\n` +
      `Teacher: ${recording.teacher_name}\n` +
      `Size: ${recording.file_size_mb} MB\n` +
      `Status: ${recording.status}\n` +
      `${recording.has_transcript ? `Transcript: ${recording.word_count} words\n` : ''}` +
      `\nThis will permanently delete:\n` +
      `• Audio file from server storage\n` +
      `• Transcript data (if available)\n` +
      `• All analysis results\n` +
      `• All processing history\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await RecordingsService.deleteRecording(recording.id);
      
      notifications.show({
        title: 'Recording Deleted',
        message: `"${recording.file_name}" has been permanently deleted`,
        color: 'green',
        icon: <IconCheck />,
      });

      // Refresh the recordings list
      await refetch();
      
    } catch (error: any) {
      console.error('Failed to delete recording:', error);
      notifications.show({
        title: 'Deletion Failed',
        message: error?.response?.data?.error || 'Failed to delete the recording. Please try again.',
        color: 'red',
      });
    }
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

  // Show message for super admin when no school is selected
  if (user?.role === 'super_admin' && !getEffectiveSchoolId()) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="No School Selected" color="blue">
          Please select a school from the school switcher above to view recordings.
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
            {user?.role === 'super_admin' && selectedSchool
              ? `Managing recordings for ${selectedSchool.name}`
              : user?.role === 'super_admin' 
              ? 'Manage all recordings across all schools'
              : 'View and manage recordings from your school'
            }
          </Text>
        </div>
        <Group>
          <Button leftSection={<IconMicrophone size={16} />} onClick={() => navigate('/upload?mode=record')}>Record Class</Button>
          <Button variant="subtle" leftSection={<IconUpload size={16} />} onClick={() => navigate('/upload?mode=upload')}>Upload File</Button>
          <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={() => refetch()} loading={isLoading}>Refresh</Button>
        </Group>
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

      {/* Advanced Filtering & Search */}
      <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
        <Title order={4} mb="md">Advanced Filtering & Search</Title>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <TextInput
              placeholder="Search by teacher or file name..."
              leftSection={<IconSearch size={16} />}
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              placeholder="Subject"
              data={uniqueSubjects}
              value={extraFilters.subject}
              onChange={(v) => setExtraFilters((p) => ({ ...p, subject: v || '' }))}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              placeholder="Grade"
              data={uniqueGrades}
              value={extraFilters.grade}
              onChange={(v) => setExtraFilters((p) => ({ ...p, grade: v || '' }))}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Button variant="subtle" onClick={() => setExtraFilters({ subject: '', grade: '', scoreRange: [0,100], dateFrom: null, dateTo: null })} fullWidth>
              Clear
            </Button>
          </Grid.Col>
        </Grid>

        <Grid mt="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text size="sm" mb={5}>Score Range: {extraFilters.scoreRange[0]}% - {extraFilters.scoreRange[1]}%</Text>
            <RangeSlider
              value={extraFilters.scoreRange}
              onChange={(val) => setExtraFilters((p) => ({ ...p, scoreRange: val as [number, number] }))}
              min={0}
              max={100}
              step={5}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text size="sm" mb={5}>Date Range</Text>
            <Group>
              <DatePickerInput placeholder="From" value={extraFilters.dateFrom} onChange={(v) => setExtraFilters((p) => ({ ...p, dateFrom: v }))} size="sm" />
              <DatePickerInput placeholder="To" value={extraFilters.dateTo} onChange={(v) => setExtraFilters((p) => ({ ...p, dateTo: v }))} size="sm" />
            </Group>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Recordings Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader size="md" />
            <Text mt="md" c="dimmed">Loading recordings...</Text>
          </div>
        ) : filteredRecords.length === 0 ? (
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
                    <Table.Th>Class Information</Table.Th>
                    <Table.Th>School</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Upload Date</Table.Th>
                    <Table.Th>Transcript</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRecords.map((recording) => (
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
                        <div>
                          <Group gap="xs" mb={2}>
                            <IconChalkboard size={14} />
                            <Text size="sm" fw={500}>
                              {recording.class_name || 'Untitled Class'}
                            </Text>
                          </Group>
                          <Group gap="xs" mb={2}>
                            <IconBook size={14} />
                            <Text size="xs" c="dimmed">
                              {recording.subject || 'No Subject'}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconHash size={14} />
                            <Text size="xs" c="dimmed">
                              {recording.grade ? `Grade ${recording.grade}` : 'No Grade'}
                            </Text>
                          </Group>
                          {recording.class_duration_minutes && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {recording.class_duration_minutes} min
                            </Text>
                          )}
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
                          <ActionIcon
                            variant="subtle"
                            color="teal"
                            onClick={() => listenRecording(recording)}
                            title="Listen"
                          >
                            <IconPlayerPlay size={16} />
                          </ActionIcon>
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
                          {/* Re-transcribe action: available to teacher (own), manager (same school), super admin */}
                          <ActionIcon
                            variant="subtle"
                            color="teal"
                            onClick={() => retranscribe(recording)}
                            title="Re-run transcription"
                          >
                            <IconRefresh size={16} />
                          </ActionIcon>
                          {recording.has_transcript && (
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              onClick={() => openApplyTemplate(recording)}
                              title="Apply template analysis"
                            >
                              <IconTemplate size={16} />
                            </ActionIcon>
                          )}
                          <ActionIcon
                            variant="subtle"
                            color={recording.analysis_count && recording.analysis_count > 0 ? 'indigo' : 'gray'}
                            onClick={() => viewAnalysis(recording)}
                            title={recording.analysis_count && recording.analysis_count > 0 ? 'View analysis results' : 'No analysis yet'}
                            disabled={!(recording.analysis_count && recording.analysis_count > 0)}
                          >
                            <IconChartBar size={16} />
                          </ActionIcon>
                          
                          {/* Only show delete button for school managers and super admins */}
                          {(['school_manager', 'super_admin'].includes(user?.role || '')) && (
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => handleDeleteRecording(recording)}
                              title="Delete recording"
                            >
                              <IconTrash size={16} />
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

      {/* Apply Template Modal */}
      <Modal opened={applyModalOpened} onClose={() => setApplyModalOpened(false)} title="Apply Template Analysis" size="md">
        <Stack>
          {loadingTemplates ? (
            <Loader />
          ) : templates.length === 0 ? (
            <Alert color="gray">No templates available.</Alert>
          ) : (
            <Select
              label="Select Template"
              placeholder="Choose a template"
              data={templates.map(t => ({ value: String(t.id), label: t.template_name }))}
              value={selectedTemplateId}
              onChange={(v) => setSelectedTemplateId(v || '')}
            />
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setApplyModalOpened(false)}>Cancel</Button>
            <Button disabled={!selectedTemplateId} onClick={applyTemplate} leftSection={<IconTemplate size={16} />}>Apply</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Analysis Results Modal */}
      <Modal 
        opened={resultsModalOpened} 
        onClose={() => setResultsModalOpened(false)} 
        size="lg" 
        title={
          <Group justify="space-between" w="100%">
            <Text fw={600} size="lg">Analysis Results</Text>
            {selectedAnalysis && (
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                size="sm"
                onClick={() => handleDownloadPDF(selectedAnalysis)}
              >
                Export PDF
              </Button>
            )}
          </Group>
        }
      >
        {selectedAnalysis ? (
          <Stack>
            <AnalysisResults analysis={selectedAnalysis} />
            {analysisResults.length > 1 && (
              <Group justify="center" mt="md">
                <Button variant="subtle" onClick={() => { setResultsModalOpened(false); setAnalysisSelectionModalOpened(true); }}>
                  ← Back to Analysis Selection
                </Button>
              </Group>
            )}
          </Stack>
        ) : (
          <Alert color="gray">No analysis results found.</Alert>
        )}
      </Modal>

      {/* Analysis Selection Modal (choose one when multiple exist) */}
      <Modal
        opened={analysisSelectionModalOpened}
        onClose={() => { setAnalysisSelectionModalOpened(false); setAnalysisResults([]); }}
        title="Select Analysis to View"
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">This recording has multiple analyses. Select one to view:</Text>
          {analysisResults.map((analysis) => (
            <Paper key={analysis.id} p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => handleSelectAnalysis(analysis)}>
              <Group justify="space-between">
                <div>
                  <Text fw={500} mb="xs">{analysis.template_name || 'Template'}</Text>
                  <Group gap="xs" mb="xs">
                    <Badge size="sm" variant="light" color="blue">Score: {analysis.overall_score}</Badge>
                    <Badge size="sm" variant="outline" color="gray">{new Date(analysis.created_at).toLocaleString()}</Badge>
                  </Group>
                  {analysis.template_description && (
                    <Text size="xs" c="dimmed">{analysis.template_description}</Text>
                  )}
                </div>
                <Group gap="xs">
                  <ActionIcon 
                    variant="light" 
                    color="blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAnalysis(analysis);
                    }}
                    aria-label="View Analysis"
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="light" 
                    color="green"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPDF(analysis);
                    }}
                    aria-label="Download PDF"
                  >
                    <IconDownload size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
          <Button variant="subtle" onClick={() => setAnalysisSelectionModalOpened(false)} mt="md">Cancel</Button>
        </Stack>
      </Modal>

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
