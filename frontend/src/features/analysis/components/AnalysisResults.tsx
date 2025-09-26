import {
  Paper,
  Title,
  Text,
  Group,
  Badge,
  Progress,
  Stack,
  Grid,
  Card,
  List,
  Divider,
  ThemeIcon,
  Timeline,
  Alert
} from '@mantine/core';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUser,
  IconTemplate,
  IconCalendar,
  IconChartBar,
  IconBulb,
  IconTarget,
  IconFileText
} from '@tabler/icons-react';
import { type AnalysisResult } from '../services/analysis.service';
import { useAuthStore } from '@store/auth.store';

interface AnalysisResultsProps {
  analysis: AnalysisResult;
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === 'teacher';

  // Debug logging to see what data we're receiving
  console.log('🔍 AnalysisResults - Full analysis data:', analysis);
  console.log('🔍 AnalysisResults - Detailed feedback:', analysis.detailed_feedback);
  console.log('🔍 AnalysisResults - Detailed feedback type:', typeof analysis.detailed_feedback);
  console.log('🔍 AnalysisResults - Detailed feedback keys:', Object.keys(analysis.detailed_feedback || {}));
  console.log('🔍 AnalysisResults - Strengths count:', analysis.strengths?.length || 0);
  console.log('🔍 AnalysisResults - Improvements count:', analysis.improvements?.length || 0);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Requires Attention';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Stack>
      {/* Enhanced Header Information */}
      <Paper p="lg" withBorder radius="md" bg="blue.0">
        <Title order={3} mb="md" c="blue.9">
          Teaching Analysis Report
        </Title>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Teacher</Text>
                <Group gap="sm">
                  <ThemeIcon color="blue" variant="light" size="sm" radius="xl">
                    <IconUser size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    {analysis.teacher_first_name} {analysis.teacher_last_name}
                  </Text>
                </Group>
              </div>
              
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Analysis Template</Text>
                <Group gap="sm">
                  <ThemeIcon color="green" variant="light" size="sm" radius="xl">
                    <IconTemplate size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>
                    {analysis.template_name || 'Unknown Template'}
                  </Text>
                </Group>
              </div>

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Analysis Date</Text>
                <Group gap="sm">
                  <ThemeIcon color="orange" variant="light" size="sm" radius="xl">
                    <IconCalendar size={12} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">
                    {formatDate(analysis.created_at)}
                  </Text>
                </Group>
              </div>
            </Stack>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Recording Details</Text>
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    {analysis.class_name}
                  </Text>
                  <Group gap="xs">
                    <Badge size="sm" color="blue" variant="light">
                      {analysis.subject}
                    </Badge>
                    <Badge size="sm" color="green" variant="light">
                      Grade {analysis.grade}
                    </Badge>
                  </Group>
                </Stack>
              </div>
              
              {analysis.file_name && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Audio File</Text>
                  <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>
                    {analysis.file_name}
                  </Text>
                </div>
              )}
              
              {analysis.applied_by_first_name && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Applied By</Text>
                  <Text size="sm" c="dimmed">
                    {analysis.applied_by_first_name} {analysis.applied_by_last_name}
                  </Text>
                </div>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Overall Score - Hidden for Teachers */}
      {!isTeacher && (
        <Paper p="xl" withBorder radius="md" style={{
          background: `linear-gradient(135deg,
            ${getScoreColor(analysis.overall_score) === 'green' ? '#e8f5e8' :
              getScoreColor(analysis.overall_score) === 'yellow' ? '#fff9e6' : '#ffeaea'} 0%,
            #ffffff 100%)`
        }}>
          <Stack align="center" gap="md">
            <Group gap="lg" align="center">
              <ThemeIcon
                size={64}
                radius="xl"
                color={getScoreColor(analysis.overall_score)}
                variant="filled"
              >
                <IconChartBar size={32} />
              </ThemeIcon>
              <div style={{ textAlign: 'center' }}>
                <Title order={1} c={getScoreColor(analysis.overall_score)} size="3rem">
                  {Math.round(analysis.overall_score)}
                </Title>
                <Text size="lg" fw={500} c="dimmed">
                  Overall Teaching Performance
                </Text>
              </div>
            </Group>

            <div style={{ width: '100%', maxWidth: '400px' }}>
              <Progress
                value={analysis.overall_score}
                color={getScoreColor(analysis.overall_score)}
                size="xl"
                radius="xl"
                mb="sm"
                styles={{
                  bar: { borderRadius: '12px' }
                }}
              />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Needs Work</Text>
                <Text size="xs" c="dimmed">Excellent</Text>
              </Group>
            </div>

            <Group gap="md">
              <Badge
                size="xl"
                color={getScoreColor(analysis.overall_score)}
                variant="filled"
                radius="md"
              >
                {getScoreLabel(analysis.overall_score)}
              </Badge>
              {analysis.detailed_feedback && (
                <Badge
                  size="lg"
                  color="blue"
                  variant="light"
                  radius="md"
                >
                  {Object.keys(analysis.detailed_feedback).length} Criteria Evaluated
                </Badge>
              )}
            </Group>
          </Stack>
        </Paper>
      )}

      <Grid>
        {/* Strengths */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder h="100%">
            <Group mb="md">
              <ThemeIcon color="green" variant="light" radius="xl">
                <IconTrendingUp size={16} />
              </ThemeIcon>
              <Title order={4}>Strengths</Title>
            </Group>
            
            {analysis.strengths && analysis.strengths.length > 0 ? (
              <List spacing="sm" size="sm">
                {analysis.strengths.map((strength, index) => (
                  <List.Item key={index} icon={
                    <ThemeIcon color="green" size={16} radius="xl">
                      <Text size="xs">✓</Text>
                    </ThemeIcon>
                  }>
                    <Text size="sm" fw={500}>
                      {strength}
                    </Text>
                  </List.Item>
                ))}
              </List>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                No specific strengths identified in this analysis.
              </Text>
            )}
          </Card>
        </Grid.Col>

        {/* Areas for Improvement */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder h="100%">
            <Group mb="md">
              <ThemeIcon color="orange" variant="light" radius="xl">
                <IconTarget size={16} />
              </ThemeIcon>
              <Title order={4}>Areas for Improvement</Title>
            </Group>
            
            {analysis.improvements && analysis.improvements.length > 0 ? (
              <List spacing="sm" size="sm">
                {analysis.improvements.map((improvement, index) => (
                  <List.Item key={index} icon={
                    <ThemeIcon color="orange" size={16} radius="xl">
                      <Text size="xs">→</Text>
                    </ThemeIcon>
                  }>
                    <Text size="sm" fw={500}>
                      {improvement}
                    </Text>
                  </List.Item>
                ))}
              </List>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                No specific areas for improvement identified in this analysis.
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* Detailed Feedback */}
      <Paper p="lg" withBorder>
        <Group mb="lg">
          <ThemeIcon color="blue" variant="light" radius="xl">
            <IconBulb size={16} />
          </ThemeIcon>
          <Title order={4}>Detailed Feedback by Category</Title>
        </Group>

        {analysis.detailed_feedback && Object.keys(analysis.detailed_feedback).length > 0 ? (
          <Timeline active={-1} bulletSize={32} lineWidth={3}>
            {Object.entries(analysis.detailed_feedback).map(([category, feedback], index) => (
              <Timeline.Item
                key={category}
                title={
                  <Group gap="md" mb="sm">
                    <Text size="lg" fw={600}>
                      {category}
                    </Text>
                    {!isTeacher && (
                      <>
                        <Badge
                          size="lg"
                          color={getScoreColor(feedback.score)}
                          variant="filled"
                          radius="md"
                        >
                          {Math.round(feedback.score)}
                        </Badge>
                        <Badge
                          size="sm"
                          color={getScoreColor(feedback.score)}
                          variant="light"
                        >
                          {getScoreLabel(feedback.score)}
                        </Badge>
                      </>
                    )}
                  </Group>
                }
                bullet={
                  <ThemeIcon
                    size={32}
                    color={isTeacher ? 'blue' : getScoreColor(feedback.score)}
                    radius="xl"
                  >
                    <Text size="sm" fw={700} c="white">
                      {isTeacher ? category.charAt(0) : Math.round(feedback.score)}
                    </Text>
                  </ThemeIcon>
                }
              >
                <Paper p="lg" bg="gray.0" mt="xs" radius="md" withBorder>
                  <Stack gap="md">
                    {!isTeacher && (
                      <>
                        <div>
                          <Text size="sm" c="dimmed" mb="xs">Performance Score</Text>
                          <Progress
                            value={feedback.score}
                            color={getScoreColor(feedback.score)}
                            size="lg"
                            radius="xl"
                            mb="xs"
                            styles={{
                              bar: { borderRadius: '8px' }
                            }}
                          />
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">0</Text>
                            <Text size="sm" fw={600} c={getScoreColor(feedback.score)}>
                              {Math.round(feedback.score)}
                            </Text>
                            <Text size="xs" c="dimmed">100</Text>
                          </Group>
                        </div>

                        <Divider />
                      </>
                    )}
                    
                    <div>
                      <Text size="sm" fw={500} mb="xs" c="dark">
                        Detailed Analysis:
                      </Text>
                      <Text size="sm" style={{ lineHeight: 1.6 }}>
                        {feedback.feedback}
                      </Text>
                    </div>
                  </Stack>
                </Paper>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Alert icon={<IconBulb size={16} />} color="gray" variant="light">
            <Text fw={500} mb="xs">No Detailed Feedback Available</Text>
            <Text size="sm">
              This analysis doesn't contain detailed criterion-based feedback. 
              The template may not have been configured with specific evaluation criteria.
            </Text>
          </Alert>
        )}
      </Paper>

      {/* Analysis Metadata */}
      <Paper p="lg" withBorder bg="gray.0" radius="md">
        <Group mb="md">
          <ThemeIcon color="gray" variant="light" radius="xl">
            <IconFileText size={16} />
          </ThemeIcon>
          <Title order={5}>Analysis Information</Title>
        </Group>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>AI Model</Text>
              <Text size="sm" fw={500}>
                {analysis.ai_model || 'Unknown Model'}
              </Text>
              
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Template Used</Text>
              <Text size="sm" fw={500}>
                {analysis.template_name || 'Unknown Template'}
              </Text>
              
              {analysis.template_description && (
                <>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Template Description</Text>
                  <Text size="sm">
                    {analysis.template_description}
                  </Text>
                </>
              )}
            </Stack>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Analysis Date</Text>
              <Text size="sm" fw={500}>
                {formatDate(analysis.created_at)}
              </Text>
              
              {analysis.applied_by_first_name && (
                <>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Applied By</Text>
                  <Text size="sm" fw={500}>
                    {analysis.applied_by_first_name} {analysis.applied_by_last_name}
                  </Text>
                </>
              )}
              
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Analysis Summary</Text>
              <Group gap="xs">
                <Badge size="xs" color="blue" variant="outline">
                  {analysis.strengths?.length || 0} Strengths
                </Badge>
                <Badge size="xs" color="orange" variant="outline">
                  {analysis.improvements?.length || 0} Improvements
                </Badge>
                {analysis.detailed_feedback && (
                  <Badge size="xs" color="green" variant="outline">
                    {Object.keys(analysis.detailed_feedback).length} Criteria
                  </Badge>
                )}
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
}
