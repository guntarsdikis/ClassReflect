import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Button,
  Table,
  Badge,
  Select,
  Modal,
  Stack,
  Alert,
  Progress,
  Divider,
  ActionIcon,
  Tooltip,
  LoadingOverlay
} from '@mantine/core';
import {
  IconTemplate,
  IconFileText,
  IconChartBar,
  IconEye,
  IconAlertCircle,
  IconCheck,
  IconClock
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@store/auth.store';
import { useSchoolContextStore } from '@store/school-context.store';
import { analysisService, type RecordingForAnalysis, type AnalysisResult, type AnalysisJobStatus } from '../services/analysis.service';
import { templatesService, type Template } from '@features/templates/services/templates.service';
import { AnalysisResults } from './AnalysisResults';

export function AnalysisManager() {
  const user = useAuthStore((state) => state.user);
  const { selectedSchool } = useSchoolContextStore();

  const [recordings, setRecordings] = useState<RecordingForAnalysis[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [applyingAnalysis, setApplyingAnalysis] = useState(false);

  // Job tracking states
  const [currentJobStatus, setCurrentJobStatus] = useState<AnalysisJobStatus | null>(null);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  // Modal states
  const [selectedRecording, setSelectedRecording] = useState<RecordingForAnalysis | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  // Results modal
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisListModalOpen, setAnalysisListModalOpen] = useState(false);
  const [availableAnalyses, setAvailableAnalyses] = useState<AnalysisResult[]>([]);

  const getEffectiveSchoolId = () => {
    if (user?.role === 'super_admin') {
      return selectedSchool?.id;
    }
    return user?.schoolId;
  };

  const loadRecordings = async () => {
    try {
      setLoadingRecordings(true);
      const schoolId = getEffectiveSchoolId();
      const data = await analysisService.getRecordingsForAnalysis(schoolId);
      setRecordings(data);
    } catch (error: any) {
      console.error('Failed to load recordings:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load recordings for analysis',
        color: 'red',
      });
    } finally {
      setLoadingRecordings(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const schoolId = getEffectiveSchoolId();
      
      console.log('🏫 Loading templates with school filter:');
      console.log('   User role:', user?.role);
      console.log('   User school_id:', user?.schoolId);  
      console.log('   Selected school:', selectedSchool?.id, selectedSchool?.name);
      console.log('   Effective school ID:', schoolId);
      
      const data = await templatesService.getTemplates({
        school_id: schoolId || undefined
      });
      
      // Ensure we have a valid array with proper validation
      if (Array.isArray(data)) {
        // Additional validation for each template
        const validatedTemplates = data.filter(template => {
          const isValid = template && 
            typeof template === 'object' && 
            template.id !== undefined && 
            template.id !== null &&
            template.template_name && 
            typeof template.template_name === 'string';
          
          if (!isValid) {
            console.warn('❌ Invalid template found:', template);
          }
          return isValid;
        });
        
        setTemplates(validatedTemplates);
      } else {
        console.warn('❌ Templates service returned invalid data:', data);
        setTemplates([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load templates:', error);
      setTemplates([]);
      notifications.show({
        title: 'Error',
        message: 'Failed to load templates',
        color: 'red',
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadRecordings();
    loadTemplates();
  }, [selectedSchool]);

  const handleApplyTemplate = async () => {
    if (!selectedRecording || !selectedTemplateId) return;

    try {
      setApplyingAnalysis(true);
      
      // Start the analysis job
      const jobResponse = await analysisService.applyTemplate({
        transcriptId: selectedRecording.transcript_id,
        templateId: parseInt(selectedTemplateId)
      });

      notifications.show({
        title: 'Analysis Started',
        message: `Template analysis job created. ${jobResponse.estimatedTimeMinutes}`,
        color: 'blue',
        icon: <IconClock />,
      });

      // Set initial job status
      setCurrentJobStatus({
        id: jobResponse.analysisJobId,
        status: 'queued' as const,
        progress: {
          percent: 0,
          message: 'Analysis job queued and waiting to be processed...'
        },
        timeline: {
          queued_at: new Date().toISOString()
        },
        template: {
          name: templates.find(t => t.id.toString() === selectedTemplateId)?.template_name || 'Selected Template',
          category: templates.find(t => t.id.toString() === selectedTemplateId)?.category || 'Unknown'
        },
        recording: {
          class_name: selectedRecording.class_name,
          subject: selectedRecording.subject,
          grade: selectedRecording.grade,
          word_count: selectedRecording.word_count
        },
        teacher: {
          first_name: selectedRecording.teacher_first_name,
          last_name: selectedRecording.teacher_last_name
        }
      });

      setPollingJobId(jobResponse.analysisJobId);

      // Start polling for job status
      try {
        const finalStatus = await analysisService.pollJobStatus(
          jobResponse.analysisJobId,
          (status) => {
            console.log('📊 Job status update:', status);
            setCurrentJobStatus(status);
          }
        );

        // Job completed successfully
        notifications.show({
          title: 'Analysis Complete',
          message: 'Template analysis completed successfully! Results are ready to view.',
          color: 'green',
          icon: <IconCheck />,
        });

        // Refresh recordings to update has_analysis status
        await loadRecordings();
        
        // Clear job tracking
        setCurrentJobStatus(null);
        setPollingJobId(null);

      } catch (pollingError: any) {
        console.error('Job polling failed:', pollingError);
        notifications.show({
          title: 'Analysis Failed',
          message: pollingError.message || 'Analysis job failed or timed out',
          color: 'red',
        });
        
        // Clear job tracking
        setCurrentJobStatus(null);
        setPollingJobId(null);
      }
      
      // Close modal
      setModalOpen(false);
      setSelectedRecording(null);
      setSelectedTemplateId('');
      
    } catch (error: any) {
      console.error('Failed to start template analysis:', error);
      notifications.show({
        title: 'Failed to Start Analysis',
        message: error.message || 'Failed to create template analysis job',
        color: 'red',
      });
    } finally {
      setApplyingAnalysis(false);
    }
  };

  const handleViewResults = async (recording: RecordingForAnalysis) => {
    try {
      const results = await analysisService.getAnalysisResults(recording.transcript_id);
      if (results && results.length > 0) {
        if (results.length === 1) {
          // Single analysis - show directly
          setSelectedAnalysis(results[0]);
          setResultsModalOpen(true);
        } else {
          // Multiple analyses - show selection modal
          setAvailableAnalyses(results);
          setAnalysisListModalOpen(true);
        }
      } else {
        notifications.show({
          title: 'No Results',
          message: 'No analysis results found for this recording',
          color: 'orange',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load analysis results',
        color: 'red',
      });
    }
  };

  const handleSelectAnalysis = (analysis: AnalysisResult) => {
    setSelectedAnalysis(analysis);
    setAnalysisListModalOpen(false);
    setResultsModalOpen(true);
  };

  const openApplyModal = (recording: RecordingForAnalysis) => {
    setSelectedRecording(recording);
    setModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role === 'super_admin' && !selectedSchool) {
    return (
      <Container size="lg">
        <Paper shadow="sm" radius="md" p="lg" withBorder>
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            Please select a school to view and manage template analysis.
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Paper shadow="sm" radius="md" p="lg" withBorder>
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={2} mb="sm">
              Template Analysis Manager
            </Title>
            <Text c="dimmed">
              Apply analysis templates to completed recordings and review results
            </Text>
            {user?.role === 'super_admin' && selectedSchool && (
              <Text size="sm" c="dimmed" mt={4}>
                Managing analyses for {selectedSchool.name}
              </Text>
            )}
          </div>
          <Badge variant="light" size="lg">
            {recordings.length} recordings available
          </Badge>
        </Group>

        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={loadingRecordings} />
          
          {/* Job Progress Display */}
          {currentJobStatus && (
            <Alert 
              mb="md" 
              p="lg"
              color={
                currentJobStatus.status === 'completed' ? 'green' :
                currentJobStatus.status === 'failed' ? 'red' : 'blue'
              }
              title={
                <Group gap="sm">
                  <Text fw={600} size="sm">
                    Analysis Job: {currentJobStatus.template.name}
                  </Text>
                  <Badge 
                    size="sm" 
                    color={
                      currentJobStatus.status === 'completed' ? 'green' :
                      currentJobStatus.status === 'failed' ? 'red' : 'blue'
                    }
                    variant="filled"
                  >
                    {currentJobStatus.status.toUpperCase()}
                  </Badge>
                </Group>
              }
              icon={
                currentJobStatus.status === 'processing' ? (
                  <IconClock size={20} />
                ) : currentJobStatus.status === 'completed' ? (
                  <IconCheck size={20} />
                ) : (
                  <IconAlertCircle size={20} />
                )
              }
            >
              <Stack gap="sm">
                <Text size="sm">
                  <Text span fw={500}>Recording:</Text> {currentJobStatus.recording.class_name} • {currentJobStatus.recording.subject} • Grade {currentJobStatus.recording.grade}
                </Text>
                
                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>Progress</Text>
                    <Text size="sm" c="dimmed">{currentJobStatus.progress.percent}%</Text>
                  </Group>
                  <Progress 
                    value={currentJobStatus.progress.percent} 
                    color={
                      currentJobStatus.status === 'completed' ? 'green' :
                      currentJobStatus.status === 'failed' ? 'red' : 'blue'
                    }
                    size="md" 
                    animated={currentJobStatus.status === 'processing'}
                    mb="sm"
                  />
                  <Text size="xs" c="dimmed" fs="italic">
                    {currentJobStatus.progress.message}
                  </Text>
                </div>

                {currentJobStatus.error_message && (
                  <Alert color="red" variant="light" size="sm">
                    <Text size="xs">Error: {currentJobStatus.error_message}</Text>
                  </Alert>
                )}

                {currentJobStatus.status === 'completed' && currentJobStatus.overall_score && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>Final Score:</Text>
                    <Badge size="lg" color="green" variant="filled">
                      {Math.round(currentJobStatus.overall_score)}%
                    </Badge>
                  </Group>
                )}
              </Stack>
            </Alert>
          )}

          {recordings.length === 0 && !loadingRecordings ? (
            <Alert icon={<IconFileText size={16} />} color="gray">
              No completed recordings with transcripts found. Upload and process some recordings first.
            </Alert>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Recording Details</Table.Th>
                  <Table.Th>Teacher</Table.Th>
                  <Table.Th>Transcript</Table.Th>
                  <Table.Th>Analysis Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recordings.map((recording) => (
                  <Table.Tr key={recording.job_id}>
                    <Table.Td>
                      <Stack gap="xs">
                        <Text fw={500} size="sm">
                          {recording.class_name}
                        </Text>
                        <Group gap="xs">
                          <Badge size="xs" variant="outline">
                            {recording.subject}
                          </Badge>
                          <Badge size="xs" variant="outline">
                            Grade {recording.grade}
                          </Badge>
                          <Badge size="xs" variant="outline">
                            {recording.class_duration_minutes}min
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatDate(recording.uploaded_at)}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {recording.teacher_first_name} {recording.teacher_last_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap="xs">
                        <Text size="sm">
                          {recording.word_count?.toLocaleString() || 0} words
                        </Text>
                        {recording.confidence_score && (
                          <Group gap="xs">
                            <Progress 
                              value={recording.confidence_score * 100} 
                              size="xs" 
                              style={{ flex: 1, maxWidth: 100 }} 
                            />
                            <Text size="xs" c="dimmed">
                              {Math.round(recording.confidence_score * 100)}%
                            </Text>
                          </Group>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      {recording.analysis_count > 0 ? (
                        <Badge color="green" leftSection={<IconCheck size={12} />}>
                          {recording.analysis_count} {recording.analysis_count === 1 ? 'Analysis' : 'Analyses'}
                        </Badge>
                      ) : (
                        <Badge color="gray" leftSection={<IconClock size={12} />}>
                          Not analyzed
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Apply Template Analysis">
                          <ActionIcon 
                            variant="light" 
                            color="green"
                            onClick={() => openApplyModal(recording)}
                          >
                            <IconTemplate size={16} />
                          </ActionIcon>
                        </Tooltip>
                        
                        <Tooltip label="View Analysis Results">
                          <ActionIcon 
                            variant="light" 
                            color="blue"
                            onClick={() => handleViewResults(recording)}
                            disabled={!recording.has_analysis}
                          >
                            <IconChartBar size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>
      </Paper>

      {/* Apply Template Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRecording(null);
          setSelectedTemplateId('');
        }}
        title="Apply Template Analysis"
        size="md"
      >
        {selectedRecording && (
          <Stack>
            <Alert icon={<IconTemplate size={16} />} color="blue">
              <Text size="sm" fw={500}>Recording: {selectedRecording.class_name}</Text>
              <Text size="sm">
                {selectedRecording.teacher_first_name} {selectedRecording.teacher_last_name} • 
                {selectedRecording.subject} • Grade {selectedRecording.grade}
              </Text>
            </Alert>

{(() => {
              if (loadingTemplates) {
                return (
                  <Select
                    label="Select Analysis Template"
                    placeholder="Loading templates..."
                    data={[]}
                    disabled
                  />
                );
              }

              let selectData = [];
              
              try {
                if (Array.isArray(templates)) {
                  const filteredTemplates = templates.filter(template => {
                    return template && template.id && template.template_name;
                  });
                  
                  selectData = filteredTemplates.map(template => ({
                    value: template.id.toString(),
                    label: template.template_name || 'Unnamed Template',
                    group: template.category || 'Uncategorized'
                  }));
                } else {
                  console.warn('❌ templates is not an array:', templates);
                  selectData = [];
                }
              } catch (error) {
                console.error('❌ Error processing templates for Select:', error);
                selectData = [];
              }

              return (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Select Analysis Template
                  </label>
                  {selectData.length === 0 ? (
                    <div style={{ padding: '8px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                      No templates available
                    </div>
                  ) : (
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      required
                    >
                      <option value="">Choose a template to apply</option>
                      {selectData.map((item, index) => (
                        <option key={`${item.value}-${index}`} value={item.value}>
                          {item.label} ({item.group})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })()}

            {selectedTemplateId && (
              <Alert icon={<IconAlertCircle size={16} />} color="blue">
                <Text size="sm">
                  This will create a new analysis of the recording transcript using the selected template. 
                  You can apply multiple templates to the same recording to get different perspectives.
                </Text>
              </Alert>
            )}

            <Divider />

            <Group justify="flex-end">
              <Button 
                variant="subtle" 
                onClick={() => {
                  setModalOpen(false);
                  setSelectedRecording(null);
                  setSelectedTemplateId('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId}
                loading={applyingAnalysis}
                leftSection={<IconTemplate size={16} />}
              >
                Apply Analysis
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Analysis Selection Modal */}
      <Modal
        opened={analysisListModalOpen}
        onClose={() => {
          setAnalysisListModalOpen(false);
          setAvailableAnalyses([]);
        }}
        title="Select Analysis to View"
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            This recording has multiple analyses. Select one to view:
          </Text>
          
          {availableAnalyses.map((analysis) => (
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
                    <Badge size="sm" variant="light" color="blue">
                      Score: {analysis.overall_score}
                    </Badge>
                    <Badge size="sm" variant="outline" color="gray">
                      {formatDate(analysis.created_at)}
                    </Badge>
                    <Badge size="sm" variant="filled" color="green">
                      Template ID: {analysis.template_id}
                    </Badge>
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
                <ActionIcon variant="light" color="blue">
                  <IconEye size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Modal>

      {/* Results Modal */}
      <Modal
        opened={resultsModalOpen}
        onClose={() => {
          setResultsModalOpen(false);
          setSelectedAnalysis(null);
        }}
        title="Analysis Results"
        size="xl"
      >
        {selectedAnalysis && (
          <AnalysisResults analysis={selectedAnalysis} />
        )}
      </Modal>
    </Container>
  );
}