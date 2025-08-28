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
  Modal,
  TextInput,
  Select,
  MultiSelect,
  Textarea,
  NumberInput,
  Switch,
  Space,
  Flex,
  Alert,
  Tabs,
  Accordion,
  Divider,
  SimpleGrid,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import {
  IconTemplate,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconCopy,
  IconCheck,
  IconX,
  IconSearch,
  IconFilter,
  IconStars,
  IconWorld,
  IconSchool,
  IconChartBar,
  IconCategory,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { format } from 'date-fns';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@store/auth.store';
import { 
  templatesService, 
  Template, 
  CreateTemplateRequest, 
  TemplateCriterion,
  TemplateFilters 
} from '../services/templates.service';
import { schoolsService, School } from '@features/schools/services/schools.service';
import { subjectsService, SchoolSubject } from '@features/schools/services/subjects.service';
import { useSchoolContextStore } from '@store/school-context.store';

export function TemplateManagement() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { selectedSchool } = useSchoolContextStore();
  const isSuperAdmin = user.role === 'super_admin';
  const isSchoolManager = user.role === 'school_manager';
  
  // Determine which school ID to use
  const getEffectiveSchoolId = () => {
    if (isSuperAdmin) {
      return selectedSchool?.id || null;
    }
    return user.schoolId;
  };
  
  const currentUserSchoolId = getEffectiveSchoolId();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);
  const [applyModalOpened, { open: openApplyModal, close: closeApplyModal }] = useDisclosure(false);
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [categories, setCategories] = useState<{
    id: number;
    category_name: string;
    description?: string;
    color?: string;
    template_count: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<Template | null>(null);
  
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    template_name: '',
    description: '',
    category: '',
    grade_levels: [],
    subjects: [],
    is_global: false, // Always false - no global templates
    school_id: isSchoolManager ? currentUserSchoolId : undefined,
    criteria: [],
  });

  const [newCriterion, setNewCriterion] = useState<Omit<TemplateCriterion, 'id' | 'template_id' | 'created_at'>>({
    criteria_name: '',
    criteria_description: '',
    weight: 1.0,
    order_index: 0,
  });

  const [applySchoolId, setApplySchoolId] = useState<string>('');

  // Weight calculation and validation
  const calculateTotalWeight = (criteria: TemplateCriterion[]) => {
    return criteria.reduce((total, criterion) => {
      const weight = typeof criterion.weight === 'number' ? criterion.weight : parseFloat(criterion.weight?.toString() || '0') || 0;
      return total + weight;
    }, 0);
  };

  const totalWeight = Number(calculateTotalWeight(formData.criteria || []));
  const remainingWeight = Number((100 - totalWeight).toFixed(2));
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01; // Allow small floating point differences

  const getWeightColor = () => {
    if (Math.abs(totalWeight - 100) < 0.01) return 'green';
    if (totalWeight < 100) return 'blue'; 
    return 'red';
  };

  const getWeightLabel = () => {
    if (isNaN(totalWeight) || totalWeight === 0) return 'No criteria added';
    if (Math.abs(totalWeight - 100) < 0.01) return 'Perfect (100%)';
    if (totalWeight < 100) return `Need ${remainingWeight.toFixed(1)}% more`;
    return `${(totalWeight - 100).toFixed(1)}% over limit`;
  };

  // Load data on component mount and when school context changes
  useEffect(() => {
    if (currentUserSchoolId) {
      loadData();
    }
  }, [currentUserSchoolId, selectedSchool]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const schoolId = currentUserSchoolId;
      if (!schoolId) {
        throw new Error('School ID is required');
      }

      // Load real data from backend
      const schoolFilters = {
        ...filters,
        school_id: schoolId
      };
      
      const [templatesData, categoriesData, schoolSubjectsData] = await Promise.all([
        templatesService.getTemplates(schoolFilters),
        templatesService.getTemplateCategories(schoolId),
        subjectsService.getSchoolSubjects(schoolId),
      ]);
      
      setTemplates(templatesData);
      setCategories(categoriesData);
      setSchoolSubjects(schoolSubjectsData);

      // Load schools if super admin
      if (user?.role === 'super_admin') {
        const schoolsData = await schoolsService.getAllSchools();
        setSchools(schoolsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load templates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and reload when school context changes
  useEffect(() => {
    if (currentUserSchoolId) {
      loadData();
    }
  }, [filters, currentUserSchoolId, selectedSchool]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      description: '',
      category: '',
      grade_levels: [],
      subjects: [],
      is_global: false, // Always false - no global templates
      school_id: isSchoolManager ? currentUserSchoolId : undefined, // School managers can only create for their school
      criteria: [],
    });
    openModal();
  };

  const handleEditTemplate = async (template: Template) => {
    setEditingTemplate(template);
    
    // Load full template details including criteria
    try {
      const fullTemplate = await templatesService.getTemplate(template.id);
      setFormData({
        template_name: fullTemplate.template_name,
        description: fullTemplate.description || '',
        category: fullTemplate.category,
        grade_levels: fullTemplate.grade_levels,
        subjects: fullTemplate.subjects,
        is_global: false, // Always false - no global templates
        school_id: fullTemplate.school_id,
        criteria: fullTemplate.criteria?.map(c => ({
          criteria_name: c.criteria_name,
          criteria_description: c.criteria_description || '',
          weight: c.weight,
          order_index: c.order_index || 0,
        })) || [],
      });
      openModal();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load template details',
        color: 'red',
      });
    }
  };

  const handleViewTemplate = async (template: Template) => {
    try {
      const fullTemplate = await templatesService.getTemplate(template.id);
      setViewingTemplate(fullTemplate);
      openViewModal();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load template details',
        color: 'red',
      });
    }
  };

  const handleApplyTemplate = (template: Template) => {
    setApplyingTemplate(template);
    setApplySchoolId(user?.role === 'super_admin' ? '' : user?.schoolId?.toString() || '');
    openApplyModal();
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.template_name || !formData.category) {
        notifications.show({
          title: 'Error',
          message: 'Template name and category are required',
          color: 'red',
        });
        return;
      }

      // Validate that weights total 100%
      if (formData.criteria && formData.criteria.length > 0) {
        const totalWeight = calculateTotalWeight(formData.criteria);
        if (Math.abs(totalWeight - 100) > 0.01) {
          notifications.show({
            title: 'Weight Validation Error',
            message: `Template criteria weights must total 100%. Current total: ${totalWeight.toFixed(1)}%`,
            color: 'red',
          });
          return;
        }
      }

      // For super admin, school_id is required when creating school-specific templates
      if (isSuperAdmin && !formData.school_id) {
        notifications.show({
          title: 'Error',
          message: 'School selection is required',
          color: 'red',
        });
        return;
      }

      // Prepare the template data
      const templateData = {
        ...formData,
        is_global: false, // Always false - no global templates
        school_id: isSchoolManager ? currentUserSchoolId : formData.school_id, // Ensure school ID is set
      };

      if (editingTemplate) {
        await templatesService.updateTemplate(editingTemplate.id, templateData);
        notifications.show({
          title: 'Success',
          message: 'Template updated successfully',
          color: 'green',
        });
      } else {
        await templatesService.createTemplate(templateData);
        notifications.show({
          title: 'Success',
          message: 'Template created successfully',
          color: 'green',
        });
      }
      
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Failed to save template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save template',
        color: 'red',
      });
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await templatesService.deleteTemplate(templateId);
      notifications.show({
        title: 'Success',
        message: 'Template deleted successfully',
        color: 'green',
      });
      await loadData();
    } catch (error) {
      console.error('Failed to delete template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete template',
        color: 'red',
      });
    }
  };

  const handleApplyTemplateConfirm = async () => {
    if (!applyingTemplate) return;

    try {
      const schoolId = user?.role === 'super_admin' ? parseInt(applySchoolId) : user?.schoolId;
      if (!schoolId) {
        notifications.show({
          title: 'Error',
          message: 'School selection is required',
          color: 'red',
        });
        return;
      }

      const result = await templatesService.applyTemplate(applyingTemplate.id, schoolId);
      notifications.show({
        title: 'Success',
        message: result.message,
        color: 'green',
      });
      closeApplyModal();
    } catch (error) {
      console.error('Failed to apply template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to apply template',
        color: 'red',
      });
    }
  };

  const addCriterion = () => {
    if (!newCriterion.criteria_name) {
      notifications.show({
        title: 'Error',
        message: 'Criterion name is required',
        color: 'red',
      });
      return;
    }

    setFormData({
      ...formData,
      criteria: [
        ...(formData.criteria || []),
        {
          ...newCriterion,
          order_index: (formData.criteria?.length || 0) + 1,
        }
      ]
    });

    setNewCriterion({
      criteria_name: '',
      criteria_description: '',
      weight: 1.0,
      order_index: 0,
    });
  };

  const removeCriterion = (index: number) => {
    setFormData({
      ...formData,
      criteria: formData.criteria?.filter((_, i) => i !== index) || []
    });
  };

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const getTemplateTypeColor = (template: Template) => {
    return 'green'; // All templates are now school-specific
  };

  const getTemplateTypeLabel = (template: Template) => {
    return template.school_name || 'School Template';
  };

  // Show message for super admin when no school is selected
  if (isSuperAdmin && !currentUserSchoolId) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="No School Selected" color="blue">
          Please select a school from the school switcher above to manage templates.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Template Management</Title>
          <Text c="dimmed">
            {isSuperAdmin && selectedSchool 
              ? `Managing templates for ${selectedSchool.name}`
              : 'Create and manage feedback evaluation templates'
            }
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateTemplate}
          >
            Create Template
          </Button>
        </Group>
      </Group>

      {/* Template Statistics */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Total Templates</Text>
              <Text fw={700} size="xl">{templates.length}</Text>
            </div>
            <ThemeIcon color="blue" variant="light" radius="md" size={40}>
              <IconTemplate size={28} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Total Templates</Text>
              <Text fw={700} size="xl">{templates.length}</Text>
            </div>
            <ThemeIcon color="green" variant="light" radius="md" size={40}>
              <IconTemplate size={28} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">{isSchoolManager ? 'My School Templates' : 'School Templates'}</Text>
              <Text fw={700} size="xl">{templates.length}</Text>
            </div>
            <ThemeIcon color="blue" variant="light" radius="md" size={40}>
              <IconSchool size={28} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Categories</Text>
              <Text fw={700} size="xl">{categories.length}</Text>
            </div>
            <ThemeIcon color="teal" variant="light" radius="md" size={40}>
              <IconCategory size={28} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Filters and Search */}
      <Card shadow="sm" p="lg" radius="md" withBorder mb="xl">
        <Group>
          <TextInput
            placeholder="Search templates..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by category"
            value={filters.category || ''}
            onChange={(value) => setFilters({...filters, category: value || undefined})}
            data={[
              { value: '', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat.category_name, label: cat.category_name })),
            ]}
            w={200}
          />
          <Select
            placeholder="Filter by subject"
            value={filters.subject || ''}
            onChange={(value) => setFilters({...filters, subject: value || undefined})}
            data={[
              { value: '', label: 'All Subjects' },
              ...templatesService.getCommonSubjects().map(subj => ({ 
                value: subj, 
                label: subj 
              })),
            ]}
            w={200}
          />
        </Group>
      </Card>

      {/* Templates Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Templates ({filteredTemplates.length})</Title>
        </Group>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">Loading templates...</Text>
          </div>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Template Details</Table.Th>
                <Table.Th>Type & Category</Table.Th>
                <Table.Th>Subjects & Grades</Table.Th>
                <Table.Th>Usage & Stats</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTemplates.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Text c="dimmed">No templates found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredTemplates.map((template) => (
                  <Table.Tr key={template.id}>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{template.template_name}</Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {template.description || 'No description'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Created: {format(new Date(template.created_at), 'MMM dd, yyyy')}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Badge
                          color={getTemplateTypeColor(template)}
                          variant="light"
                          mb={4}
                        >
                          {getTemplateTypeLabel(template)}
                        </Badge>
                        <Text size="xs" c="dimmed">{template.category}</Text>
                        {template.school_name && (
                          <Text size="xs" c="dimmed">{template.school_name}</Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="xs">
                          Subjects: {template.subjects.length > 0 ? template.subjects.slice(0, 2).join(', ') : 'All'}
                          {template.subjects.length > 2 && ` +${template.subjects.length - 2} more`}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Grades: {template.grade_levels.length > 0 ? template.grade_levels.slice(0, 3).join(', ') : 'All'}
                          {template.grade_levels.length > 3 && ` +${template.grade_levels.length - 3} more`}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="xs">
                          {template.criteria_count || 0} criteria
                        </Text>
                        <Text size="xs" c="dimmed">
                          Used {template.usage_count} times
                        </Text>
                        {template.created_by_first_name && (
                          <Text size="xs" c="dimmed">
                            By: {template.created_by_first_name} {template.created_by_last_name}
                          </Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon 
                          variant="subtle" 
                          color="blue" 
                          onClick={() => handleViewTemplate(template)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="subtle" 
                          color="green"
                          onClick={() => handleApplyTemplate(template)}
                        >
                          <IconCopy size={16} />
                        </ActionIcon>
                        {(isSuperAdmin || template.school_id === currentUserSchoolId) ? (
                          <>
                            <ActionIcon 
                              variant="subtle" 
                              color="gray"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon 
                              variant="subtle" 
                              color="red"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Create/Edit Template Modal */}
      <Modal 
        opened={modalOpened} 
        onClose={closeModal} 
        title={
          <Group>
            <IconTemplate size={20} />
            <Text fw={600}>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </Text>
          </Group>
        }
        size={800}
      >
        <Stack>
          <TextInput
            label="Template Name"
            placeholder="Effective Teaching Practices"
            value={formData.template_name}
            onChange={(e) => setFormData({...formData, template_name: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Comprehensive evaluation criteria for..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            minRows={2}
          />

          <Group grow>
            <Select
              label="Category"
              placeholder="Select category"
              value={formData.category}
              onChange={(value) => setFormData({...formData, category: value || ''})}
              data={categories.map(cat => ({
                value: cat.category_name,
                label: cat.category_name
              }))}
              searchable
              allowDeselect={false}
              required
            />
            {isSuperAdmin && (
              <Select
                label="School"
                placeholder="Select school for this template"
                value={formData.school_id?.toString() || ''}
                onChange={(value) => setFormData({...formData, school_id: value ? parseInt(value) : undefined})}
                data={schools.map(school => ({
                  value: school.id.toString(),
                  label: school.name,
                }))}
                required
                disabled={isSchoolManager} // School managers can only create for their own school
              />
            )}
          </Group>

          <Group grow>
            <MultiSelect
              label="Subjects"
              placeholder="Select subjects"
              value={formData.subjects}
              onChange={(subjects) => setFormData({...formData, subjects})}
              data={schoolSubjects
                .filter(subject => subject.is_active)
                .map(subject => ({
                  value: subject.subject_name,
                  label: subject.subject_name
                }))
              }
              searchable
            />
            <MultiSelect
              label="Grade Levels"
              placeholder="Select grades"
              value={formData.grade_levels}
              onChange={(grade_levels) => setFormData({...formData, grade_levels})}
              data={templatesService.getGradeLevels()}
            />
          </Group>

          <Divider label="Evaluation Criteria" labelPosition="center" />

          {/* Existing Criteria */}
          {formData.criteria && formData.criteria.length > 0 && (
            <Stack>
              <Group justify="space-between" align="center">
                <Text fw={500} size="sm">Current Criteria ({formData.criteria.length})</Text>
                <Group gap="xs">
                  {formData.criteria.length > 1 && (
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => {
                        const equalWeight = Number((100 / formData.criteria.length).toFixed(2));
                        const newCriteria = formData.criteria.map((criterion, index) => ({
                          ...criterion,
                          weight: index === formData.criteria.length - 1 
                            ? Number((100 - (equalWeight * (formData.criteria.length - 1))).toFixed(2))
                            : equalWeight
                        }));
                        setFormData({ ...formData, criteria: newCriteria });
                      }}
                    >
                      Distribute Equally
                    </Button>
                  )}
                  <Badge
                    size="lg"
                    color={getWeightColor()}
                    variant="filled"
                  >
                    {getWeightLabel()} ({isNaN(totalWeight) ? '0.0' : totalWeight.toFixed(1)}%)
                  </Badge>
                </Group>
              </Group>
              {formData.criteria.map((criterion, index) => (
                <Paper key={index} p="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <div style={{ flex: 1 }}>
                        <Text size="sm" fw={500}>{criterion.criteria_name}</Text>
                        <Text size="xs" c="dimmed">{criterion.criteria_description}</Text>
                      </div>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeCriterion(index)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                    <Group align="flex-end">
                      <NumberInput
                        label="Weight (%)"
                        min={0.1}
                        max={100}
                        step={0.1}
                        decimalScale={1}
                        value={criterion.weight}
                        onChange={(value) => {
                          const newCriteria = [...formData.criteria];
                          newCriteria[index] = { ...criterion, weight: Number(value) };
                          setFormData({ ...formData, criteria: newCriteria });
                        }}
                        w={120}
                        size="sm"
                      />
                      <Text size="xs" c="dimmed" style={{ marginBottom: '8px' }}>
                        {totalWeight > 0 ? ((criterion.weight / totalWeight) * 100).toFixed(1) : '0.0'}% of total
                      </Text>
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          {/* Add New Criterion */}
          <Paper p="md" withBorder bg="gray.0">
            <Text fw={500} size="sm" mb="md">Add New Criterion</Text>
            <Stack>
              <TextInput
                label="Criterion Name"
                placeholder="Student Engagement"
                value={newCriterion.criteria_name}
                onChange={(e) => setNewCriterion({...newCriterion, criteria_name: e.target.value})}
              />
              <Textarea
                label="Description"
                placeholder="Measures how well the teacher engages students in learning..."
                value={newCriterion.criteria_description}
                onChange={(e) => setNewCriterion({...newCriterion, criteria_description: e.target.value})}
                minRows={2}
              />
              <Group>
                <NumberInput
                  label={`Weight (%) ${remainingWeight > 0 ? `- ${remainingWeight.toFixed(1)}% remaining` : ''}`}
                  min={0.1}
                  max={100}
                  step={0.1}
                  decimalScale={1}
                  value={newCriterion.weight}
                  onChange={(value) => setNewCriterion({...newCriterion, weight: Number(value)})}
                  description={remainingWeight > 0 ? `Suggestion: Use ${remainingWeight.toFixed(1)}% to complete the template` : totalWeight > 100 ? 'Template is over 100% weight limit' : 'Template weight is complete'}
                  w={200}
                />
                {remainingWeight > 0 && (
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => setNewCriterion({...newCriterion, weight: Number(remainingWeight.toFixed(1))})}
                  >
                    Use Remaining ({remainingWeight.toFixed(1)}%)
                  </Button>
                )}
              </Group>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={addCriterion}
                mt="md"
                fullWidth
              >
                Add Criterion
              </Button>
            </Stack>
          </Paper>

          {/* Weight Validation Warning */}
          {formData.criteria && formData.criteria.length > 0 && !isWeightValid && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color={getWeightColor() === 'red' ? 'red' : 'blue'}
              title="Weight Validation"
            >
              <Text size="sm">
                {totalWeight < 100 
                  ? `Template weights total ${totalWeight.toFixed(1)}%. Add ${remainingWeight.toFixed(1)}% more to complete the template.`
                  : `Template weights total ${totalWeight.toFixed(1)}%, which exceeds 100%. Please adjust the weights to total exactly 100%.`
                }
              </Text>
            </Alert>
          )}

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              leftSection={editingTemplate ? <IconCheck size={16} /> : <IconPlus size={16} />}
              disabled={formData.criteria && formData.criteria.length > 0 && !isWeightValid}
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </Flex>
        </Stack>
      </Modal>

      {/* View Template Modal */}
      <Modal 
        opened={viewModalOpened} 
        onClose={closeViewModal} 
        title={
          <Group>
            <IconEye size={20} />
            <Text fw={600}>{viewingTemplate?.template_name}</Text>
          </Group>
        }
        size="lg"
      >
        {viewingTemplate && (
          <Stack>
            <Group>
              <Badge
                color={getTemplateTypeColor(viewingTemplate)}
                variant="light"
              >
                {getTemplateTypeLabel(viewingTemplate)}
              </Badge>
              <Badge variant="outline">{viewingTemplate.category}</Badge>
            </Group>

            <Text>{viewingTemplate.description}</Text>

            <Group>
              <div>
                <Text size="sm" c="dimmed">Subjects:</Text>
                <Text size="sm">
                  {viewingTemplate.subjects.length > 0 ? viewingTemplate.subjects.join(', ') : 'All Subjects'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">Grades:</Text>
                <Text size="sm">
                  {viewingTemplate.grade_levels.length > 0 ? viewingTemplate.grade_levels.join(', ') : 'All Grades'}
                </Text>
              </div>
            </Group>

            <Divider label="Evaluation Criteria" labelPosition="center" />

            {viewingTemplate.criteria && viewingTemplate.criteria.length > 0 ? (
              <Stack>
                {viewingTemplate.criteria.map((criterion, index) => (
                  <Paper key={index} p="md" withBorder>
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Text fw={500}>{criterion.criteria_name}</Text>
                        <Text size="sm" c="dimmed" mt="xs">
                          {criterion.criteria_description}
                        </Text>
                      </div>
                      <Badge variant="light">Weight: {criterion.weight}</Badge>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Alert>No criteria defined for this template</Alert>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                leftSection={<IconCopy size={16} />}
                onClick={() => {
                  closeViewModal();
                  handleApplyTemplate(viewingTemplate);
                }}
              >
                Apply Template
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Apply Template Modal */}
      <Modal 
        opened={applyModalOpened} 
        onClose={closeApplyModal} 
        title={
          <Group>
            <IconCopy size={20} />
            <Text fw={600}>Apply Template</Text>
          </Group>
        }
        size="md"
      >
        {applyingTemplate && (
          <Stack>
            <Alert color="blue">
              This will copy all criteria from "{applyingTemplate.template_name}" to the selected school's evaluation criteria.
            </Alert>

            <div>
              <Text fw={500} mb="xs">Template: {applyingTemplate.template_name}</Text>
              <Text size="sm" c="dimmed">
                {applyingTemplate.criteria_count || 0} criteria will be added
              </Text>
            </div>

            {user?.role === 'super_admin' ? (
              <Select
                label="Apply to School"
                placeholder="Select school"
                value={applySchoolId}
                onChange={(value) => setApplySchoolId(value || '')}
                data={schools.map(school => ({
                  value: school.id.toString(),
                  label: school.name,
                }))}
                required
              />
            ) : (
              <Alert color="green">
                Template will be applied to your school's evaluation criteria.
              </Alert>
            )}

            <Flex justify="flex-end" gap="sm">
              <Button variant="light" onClick={closeApplyModal}>
                Cancel
              </Button>
              <Button 
                onClick={handleApplyTemplateConfirm}
                leftSection={<IconCheck size={16} />}
              >
                Apply Template
              </Button>
            </Flex>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}