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
  Divider,
  Alert,
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
  IconHistory,
  IconCheck,
  IconAlertCircle,
  IconClock,
} from '@tabler/icons-react';
import { IconMicrophone, IconUpload, IconPlayerPlay, IconTemplate } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { jobsService } from '@features/jobs/services/jobs.service';
import { useAuthStore } from '@store/auth.store';
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { analysisService, type AnalysisResult } from '@features/analysis/services/analysis.service';
import { AnalysisResults } from '@features/analysis/components/AnalysisResults';
import { AnalysisReportPDF } from '@features/analysis/components/AnalysisReportPDF';
import { pdf } from '@react-pdf/renderer';
import { templatesService, type Template } from '@features/templates/services/templates.service';
import { RecordingsService } from '@features/recordings/services/recordings.service';

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
  analysis_score?: number; // optional local score field
  latest_score?: number;   // value returned by backend (MAX overall_score)
  has_analysis: number;
  analysis_count: number;
  transcript_text?: string;
  word_count?: number;
  template_name?: string;
  latest_analysis_date?: string;
  transcript_id?: number; // Add this to get transcript ID from backend
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [detailsModalOpened, { open: openDetailsModal, close: closeDetailsModal }] = useDisclosure(false);
  const [selectedRecording, setSelectedRecording] = useState<TeacherRecording | null>(null);
  
  // Analysis-related state
  const [analysisResultsModalOpened, { open: openAnalysisModal, close: closeAnalysisModal }] = useDisclosure(false);
  const [analysisSelectionModalOpened, { open: openAnalysisSelectionModal, close: closeAnalysisSelectionModal }] = useDisclosure(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  // Template apply + playback state
  const [applyModalOpened, setApplyModalOpened] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [playbackModalOpened, setPlaybackModalOpened] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackFileName, setPlaybackFileName] = useState<string | null>(null);
  
  // Match manager-style date display for analysis list
  const formatDisplayDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };
  
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

  // Fetch teacher's recordings with auto-refresh
  const { data: recordings, isLoading, refetch } = useQuery({
    queryKey: ['teacher-recordings', user?.id],
    queryFn: () => jobsService.getTeacherJobs(user!.id.toString()),
    enabled: !!user?.id,
    refetchInterval: 5000, // Refresh every 5 seconds to catch updates
  });

  // Backend returns { jobs: [...], count: N } structure
  const recordingsData = Array.isArray(recordings?.jobs) ? recordings.jobs : [];

  // Stats for cards
  const totalCount = recordingsData.length;
  const processingCount = recordingsData.filter((r: TeacherRecording) =>
    r.status === 'queued' || r.status === 'processing' || r.status === 'uploading'
  ).length;
  const completedCount = recordingsData.filter((r: TeacherRecording) => r.status === 'completed').length;
  const failedCount = recordingsData.filter((r: TeacherRecording) => r.status === 'failed').length;

  // Handle URL parameter to auto-open specific recording
  useEffect(() => {
    const recordingId = searchParams.get('recording');
    if (recordingId && recordingsData.length > 0) {
      const recording = recordingsData.find((r: TeacherRecording) => r.id === recordingId);
      if (recording) {
        // Open analysis list/results directly like manager view
        loadAnalysisResults(recording);
        // Clear the URL parameter after opening
        searchParams.delete('recording');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [recordingsData, searchParams, setSearchParams]);

  // Load analysis results for a recording
  const loadAnalysisResults = async (recording: TeacherRecording) => {
    try {
      setLoadingAnalysis(true);
      
      // Try to get transcript_id from recording data
      let transcriptId = recording.transcript_id;
      
      if (!transcriptId) {
        notifications.show({
          title: 'Analysis Error',
          message: 'Unable to find transcript for this recording. Please try refreshing the page.',
          color: 'orange',
        });
        return;
      }
      
      const results = await analysisService.getAnalysisResults(transcriptId);
      // Sort analyses by most recent first
      const sorted = Array.isArray(results)
        ? [...results].sort((a, b) => {
            const da = new Date(a.created_at).getTime();
            const db = new Date(b.created_at).getTime();
            if (Number.isNaN(da) || Number.isNaN(db)) return 0;
            return db - da;
          })
        : [];
      
      setAnalysisResults(sorted);
      setSelectedRecording(recording);
      
      if (sorted.length === 1) {
        // Single analysis - show directly
        setSelectedAnalysis(sorted[0]);
        openAnalysisModal();
      } else if (sorted.length > 1) {
        // Multiple analyses - show selection modal first
        openAnalysisSelectionModal();
      } else {
        notifications.show({
          title: 'No Analysis Results',
          message: 'No analysis results found for this recording',
          color: 'orange',
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to load analysis results:', error);
      notifications.show({
        title: 'Error',
        message: `Failed to load analysis results: ${error.message}`,
        color: 'red',
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Handle selecting a specific analysis from the selection modal
  const handleSelectAnalysis = (analysis: AnalysisResult) => {
    setSelectedAnalysis(analysis);
    closeAnalysisSelectionModal();
    openAnalysisModal();
  };

  // Apply template helpers
  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await templatesService.getTemplates({});
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load templates:', e);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openApplyTemplate = async (recording: TeacherRecording) => {
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
      await analysisService.applyTemplate({ transcriptId: selectedRecording.transcript_id, templateId: parseInt(selectedTemplateId, 10) });
      notifications.show({ title: 'Analysis Queued', message: 'Template analysis started in background.', color: 'green' });
      setApplyModalOpened(false);
      refetch();
    } catch (e: any) {
      notifications.show({ title: 'Failed to Start Analysis', message: e?.message || 'Error applying template', color: 'red' });
    }
  };

  // Playback helpers
  const listenRecording = async (recording: TeacherRecording) => {
    try {
      const data = await RecordingsService.getPlaybackUrl(recording.id);
      setPlaybackUrl(data.url);
      setPlaybackFileName(data.fileName);
      setPlaybackModalOpened(true);
    } catch (e: any) {
      notifications.show({ title: 'Playback Error', message: e?.message || 'Unable to get audio URL', color: 'red' });
    }
  };

  // Handle PDF export
  const handleExportPDF = async (recording: TeacherRecording, analysisResult?: AnalysisResult) => {
    try {
      console.log('🔄 Starting PDF export for recording:', recording.id);
      console.log('📄 Recording transcript_id:', recording.transcript_id);
      console.log('📊 Analysis result provided:', !!analysisResult);
      
      // If no analysis result provided, get the first one
      let analysis = analysisResult;
      if (!analysis) {
        if (!recording.transcript_id) {
          console.error('❌ No transcript_id found for recording:', recording);
          notifications.show({
            title: 'Export Error',
            message: 'Unable to find transcript for this recording. Please try refreshing the page.',
            color: 'orange',
          });
          return;
        }
        
        console.log('🔍 Fetching analysis results for transcript_id:', recording.transcript_id);
        const results = await analysisService.getAnalysisResults(recording.transcript_id);
        console.log('📈 Analysis results found:', results.length);
        
        if (results.length === 0) {
          notifications.show({
            title: 'No Analysis Found',
            message: 'This recording has no analysis to export',
            color: 'orange',
          });
          return;
        }
        analysis = results[0]; // Export the first/latest analysis
        console.log('✅ Using analysis result:', analysis.id);
      }

      console.log('📝 Generating PDF for analysis:', analysis.id);

      // Generate PDF blob (hide scores and evaluations for teachers)
      console.log('🔄 Converting to blob...');
      let blob: Blob | null = null;
      try {
        blob = await pdf(
          <AnalysisReportPDF analysis={analysis} hideScores />
        ).toBlob();
      } catch (innerErr) {
        console.warn('Primary PDF blob generation failed, attempting dataURL fallback...', innerErr);
        const dataUrl = await pdf(
          <AnalysisReportPDF analysis={analysis} hideScores />
        ).toDataURL();
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }
      console.log('✅ PDF blob generated, size:', blob.size);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const className = recording.class_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'recording';
      const templateName = analysis.template_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'analysis';
      const filename = `ClassReflect_${className}_${templateName}_${date}.pdf`;
      link.download = filename;
      console.log('📁 Generated filename:', filename);
      
      // Trigger download
      console.log('⬇️ Triggering download...');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('🎉 PDF export completed successfully');
      notifications.show({
        title: 'PDF Downloaded',
        message: 'Analysis report has been downloaded successfully',
        color: 'green',
        icon: <IconDownload />,
      });
    } catch (error: any) {
      console.error('❌ Failed to export PDF:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        recording: recording,
        analysis: analysis
      });
      
      notifications.show({
        title: 'Export Failed',
        message: `Failed to generate PDF report: ${error.message}. Please try again.`,
        color: 'red',
      });
    }
  };

  const handleDeleteAnalysis = async (analysis: AnalysisResult) => {
    if (!['school_manager', 'super_admin'].includes(user?.role || '')) return;
    const confirmed = window.confirm(
      `Delete analysis "${analysis.template_name || 'Template'}" created on ${formatDisplayDate(analysis.created_at)}? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await analysisService.deleteAnalysisResult(analysis.id);
      notifications.show({ title: 'Analysis Deleted', message: 'The analysis has been removed.', color: 'green', icon: <IconCheck /> });
      setAnalysisResults((prev) => {
        const next = prev.filter((a) => a.id !== analysis.id);
        if (next.length === 0) {
          closeAnalysisSelectionModal();
        }
        return next;
      });
    } catch (e: any) {
      notifications.show({ title: 'Deletion Failed', message: e?.response?.data?.error || e?.message || 'Failed to delete analysis', color: 'red' });
    }
  };

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
      // Prefer backend's latest_score; fall back to analysis_score if present
      // Coerce score from backend (MySQL DECIMAL may arrive as string)
      const raw = (recording as any).latest_score ?? (recording as any).analysis_score;
      const scoreValue = raw !== undefined && raw !== null ? Number(raw) : undefined;
      if (scoreValue !== undefined && !Number.isNaN(scoreValue)) {
        if (scoreValue < filters.scoreRange[0] || scoreValue > filters.scoreRange[1]) return false;
      }

      // Date range filter
      // Date range filter (support from-only, to-only, or both)
      const [from, to] = filters.dateRange;
      if (from || to) {
        const uploadDate = new Date(recording.created_at);
        if (from && uploadDate < from) return false;
        if (to) {
          const end = new Date(to);
          end.setHours(23,59,59,999);
          if (uploadDate > end) return false;
        }
      }

      // Template filter (disabled for now - dataset may not include template per recording)

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
            variant="filled"
            leftSection={<IconMicrophone size={16} />}
            onClick={() => navigate('/upload?mode=record')}
          >
            Record Class
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconUpload size={16} />}
            onClick={() => navigate('/upload?mode=upload')}
          >
            Upload File
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconHistory size={16} />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleExportCSV}
            disabled={filteredRecordings.length === 0}
          >
            Export CSV
          </Button>
        </Group>
      </Group>

      {/* Stats Cards */}
      <Grid gutter="md" mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" withBorder>
            <Group>
              <IconFileText size={20} color="blue" />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Recordings
                </Text>
                <Text fw={700} size="xl">{totalCount}</Text>
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
                  Processing {processingCount > 0 && '(Auto-refreshing)'}
                </Text>
                <Text fw={700} size="xl">{processingCount}</Text>
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
                <Text fw={700} size="xl">{completedCount}</Text>
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
                <Text fw={700} size="xl">{failedCount}</Text>
              </div>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

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
              {/* Removed Template and Status dropdowns for clarity */}
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
                  filteredRecordings.map((recording: TeacherRecording, idx: number) => (
                    <Table.Tr key={`teacher-rec-${recording.id}-${idx}`}>
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
                            <Badge variant="light" size="sm">
                              {recording.subject || 'No Subject'}
                            </Badge>
                            <Badge variant="outline" size="sm">
                              {recording.grade ? `Grade ${recording.grade}` : 'No Grade'}
                            </Badge>
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
                            {recording.analysis_count === 1 ? '1 Analysis' : `${recording.analysis_count} Analyses`}
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light">
                            Not Analyzed
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
                          {recording.transcript_id && (
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => loadAnalysisResults(recording)}
                              title="View analysis results"
                              disabled={!(recording.has_analysis > 0)}
                            >
                              <IconChartBar size={16} />
                            </ActionIcon>
                          )}
                          {recording.transcript_id && (
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              onClick={() => openApplyTemplate(recording)}
                              title="Apply template analysis"
                            >
                              <IconTemplate size={16} />
                            </ActionIcon>
                          )}
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
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Class Name</Text>
                <Text fw={500}>{selectedRecording.class_name || 'Untitled Class'}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Subject & Grade</Text>
                <Text fw={500}>
                  {(selectedRecording.subject || 'No Subject')} - {selectedRecording.grade ? `Grade ${selectedRecording.grade}` : 'No Grade'}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Upload Date</Text>
                <Text fw={500}>{format(new Date(selectedRecording.created_at), 'MMM dd, yyyy h:mm a')}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Status</Text>
                {getStatusBadge(selectedRecording.status)}
              </Grid.Col>
              {selectedRecording.duration_minutes && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text size="sm" c="dimmed">Duration</Text>
                  <Text fw={500}>{selectedRecording.duration_minutes} minutes</Text>
                </Grid.Col>
              )}
              {selectedRecording.analysis_score && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
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
                <Button 
                  leftSection={<IconEye size={16} />}
                  onClick={() => {
                    closeDetailsModal();
                    loadAnalysisResults(selectedRecording);
                  }}
                  loading={loadingAnalysis}
                >
                  View Full Analysis
                </Button>
              )}
              <Button 
                variant="light" 
                leftSection={<IconDownload size={16} />}
                onClick={() => handleExportPDF(selectedRecording)}
                disabled={selectedRecording.has_analysis === 0}
              >
                Export PDF
              </Button>
              <Button variant="subtle" onClick={closeDetailsModal}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Analysis Results Modal */}
      <Modal
        opened={analysisResultsModalOpened}
        onClose={() => {
          closeAnalysisModal();
          setSelectedAnalysis(null);
        }}
        title={
          selectedAnalysis 
            ? `Analysis Results - ${selectedAnalysis.template_name}`
            : "Analysis Results"
        }
        size="xl"
        overflow="inside"
      >
        {loadingAnalysis ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <IconClock size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <Text>Loading analysis results...</Text>
          </div>
        ) : selectedAnalysis ? (
          <Stack>
            <Group justify="space-between" mb="md">
              <div>
                <Text size="lg" fw={600}>{selectedAnalysis.template_name}</Text>
                <Text size="sm" c="dimmed">
                  Applied by {selectedAnalysis.applied_by_first_name} {selectedAnalysis.applied_by_last_name} • {' '}
                  {format(new Date(selectedAnalysis.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                </Text>
              </div>
              <Button
                leftSection={<IconDownload size={16} />}
                variant="light"
                size="sm"
                onClick={() => handleExportPDF(selectedRecording!, selectedAnalysis)}
              >
                Export PDF
              </Button>
            </Group>
            <AnalysisResults analysis={selectedAnalysis} />
            
            {/* Show "Back to Selection" button if there are multiple analyses */}
            {analysisResults.length > 1 && (
              <Group justify="center" mt="lg">
                <Button 
                  variant="subtle" 
                  onClick={() => {
                    closeAnalysisModal();
                    setSelectedAnalysis(null);
                    openAnalysisSelectionModal();
                  }}
                >
                  ← Back to Analysis Selection
                </Button>
              </Group>
            )}
          </Stack>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <IconAlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <Text>No analysis results found for this recording.</Text>
          </div>
        )}
      </Modal>

      {/* Analysis Selection Modal (manager-style) */}
      <Modal
        opened={analysisSelectionModalOpened}
        onClose={() => {
          closeAnalysisSelectionModal();
          setAnalysisResults([]);
          setSelectedRecording(null);
        }}
        title="Select Analysis to View"
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            This recording has multiple analyses. Select one to view:
          </Text>
          
          {analysisResults.map((analysis) => (
            <Paper
              key={analysis.id}
              p="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => handleSelectAnalysis(analysis)}
            >
              <Group justify="space-between">
                <div>
                  <Text fw={500} mb="xs">
                    {analysis.template_name || 'Unknown Template'}
                  </Text>
                  <Group gap="xs" mb="xs">
                    <Badge size="sm" variant="outline" color="gray">
                      {formatDisplayDate(analysis.created_at)}
                    </Badge>
                    {analysis.template_id !== undefined && (
                      <Badge size="sm" variant="filled" color="green">
                        Template ID: {analysis.template_id}
                      </Badge>
                    )}
                    {user?.role === 'super_admin' && analysis.ai_model && (
                      <Badge
                        size="sm"
                        variant="outline"
                        color="violet"
                        title={`AI model used: ${analysis.ai_model}`}
                      >
                        AI: {analysis.ai_model}
                      </Badge>
                    )}
                  </Group>
                  {analysis.template_description && (
                    <Text size="xs" c="dimmed" mt="xs">
                      {analysis.template_description}
                    </Text>
                  )}
                  {analysis.applied_by_first_name && (
                    <Text size="xs" c="dimmed">
                      Applied by: {analysis.applied_by_first_name} {analysis.applied_by_last_name}
                    </Text>
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
                      e.preventDefault();
                      e.stopPropagation();
                      if (selectedRecording) {
                        handleExportPDF(selectedRecording, analysis);
                      }
                    }}
                    aria-label="Download PDF"
                  >
                    <IconDownload size={16} />
                  </ActionIcon>
                  {['school_manager', 'super_admin'].includes(user?.role || '') && (
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteAnalysis(analysis);
                      }}
                      aria-label="Delete Analysis"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            </Paper>
          ))}
          
          <Button 
            variant="subtle" 
            onClick={() => {
              closeAnalysisSelectionModal();
              setAnalysisResults([]);
              setSelectedRecording(null);
            }} 
            mt="md"
          >
            Cancel
          </Button>
        </Stack>
      </Modal>

      {/* Apply Template Modal */}
      <Modal opened={applyModalOpened} onClose={() => setApplyModalOpened(false)} title="Apply Template Analysis" size="md">
        <Stack>
          {loadingTemplates ? (
            <Text size="sm">Loading templates...</Text>
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

      {/* Playback Modal */}
      <Modal opened={playbackModalOpened} onClose={() => setPlaybackModalOpened(false)} size="md" title={playbackFileName || 'Playback'}>
        {playbackUrl ? (
          <Stack>
            <audio controls style={{ width: '100%' }} src={playbackUrl} />
            <Text size="xs" c="dimmed">The link expires in a few minutes.</Text>
          </Stack>
        ) : (
          <Text size="sm">Loading...</Text>
        )}
      </Modal>
    </Container>
  );
}
