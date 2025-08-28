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
  Textarea,
  ColorInput,
  Space,
  Flex,
  Alert,
  Loader,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTag,
  IconAlertCircle,
  IconCheck,
  IconTemplate,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useAuthStore } from '@store/auth.store';
import { useSchoolContextStore } from '@store/school-context.store';

export interface TemplateCategory {
  id: number;
  category_name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  template_count: number;
}

export interface CreateTemplateCategoryRequest {
  category_name: string;
  description?: string;
  color?: string;
}

interface CategoryFormData extends CreateTemplateCategoryRequest {
  color?: string;
}

// Template category service functions
const templateCategoryService = {
  async getTemplateCategories(schoolId: number): Promise<TemplateCategory[]> {
    const response = await fetch(`/api/schools/${schoolId}/template-categories`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch template categories');
    }
    return response.json();
  },

  async createTemplateCategory(schoolId: number, data: CreateTemplateCategoryRequest): Promise<{
    id: number;
    schoolId: number;
    category_name: string;
    description?: string;
    color?: string;
    message: string;
  }> {
    const response = await fetch(`/api/schools/${schoolId}/template-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create template category');
    }
    return response.json();
  },

  async updateTemplateCategory(schoolId: number, categoryId: number, data: Partial<CreateTemplateCategoryRequest & { is_active?: boolean }>): Promise<{
    id: number;
    message: string;
  }> {
    const response = await fetch(`/api/schools/${schoolId}/template-categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update template category');
    }
    return response.json();
  },

  async deleteTemplateCategory(schoolId: number, categoryId: number): Promise<{
    id: number;
    message: string;
  }> {
    const response = await fetch(`/api/schools/${schoolId}/template-categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete template category');
    }
    return response.json();
  },
};

export function TemplateCategoryManagement() {
  const currentUser = useAuthStore((state) => state.user);
  const { selectedSchool } = useSchoolContextStore();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<TemplateCategory | null>(null);
  
  const [formData, setFormData] = useState<CategoryFormData>({
    category_name: '',
    description: '',
    color: '#339af0',
  });

  // Role-based access control
  const isSchoolManager = currentUser.role === 'school_manager';
  const isSuperAdmin = currentUser.role === 'super_admin';
  
  // Determine which school ID to use
  const getEffectiveSchoolId = () => {
    if (isSuperAdmin) {
      return selectedSchool?.id || null;
    }
    return currentUser.schoolId;
  };
  
  const currentSchoolId = getEffectiveSchoolId();

  useEffect(() => {
    if (currentSchoolId) {
      loadCategories();
    }
  }, [currentSchoolId, selectedSchool]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      if (currentSchoolId) {
        const data = await templateCategoryService.getTemplateCategories(currentSchoolId);
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load template categories:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load template categories',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData({
      category_name: '',
      description: '',
      color: '#339af0',
    });
    openModal();
  };

  const handleEditCategory = (category: TemplateCategory) => {
    setEditingCategory(category);
    setFormData({
      category_name: category.category_name,
      description: category.description || '',
      color: category.color || '#339af0',
    });
    openModal();
  };

  const handleSaveCategory = async () => {
    try {
      if (!formData.category_name.trim()) {
        notifications.show({
          title: 'Error',
          message: 'Category name is required',
          color: 'red',
        });
        return;
      }

      if (!currentSchoolId) {
        notifications.show({
          title: 'Error',
          message: 'School ID is required',
          color: 'red',
        });
        return;
      }

      if (editingCategory) {
        await templateCategoryService.updateTemplateCategory(currentSchoolId, editingCategory.id, formData);
        notifications.show({
          title: 'Success',
          message: 'Template category updated successfully',
          color: 'green',
        });
      } else {
        await templateCategoryService.createTemplateCategory(currentSchoolId, formData);
        notifications.show({
          title: 'Success',
          message: 'Template category created successfully',
          color: 'green',
        });
      }
      
      await loadCategories();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save template category:', error);
      const message = error?.message || 'Failed to save template category';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }
  };

  const handleDeleteCategory = (category: TemplateCategory) => {
    modals.openConfirmModal({
      title: 'Delete Template Category',
      children: (
        <div>
          <Text size="sm">
            Are you sure you want to delete the template category "{category.category_name}"? 
          </Text>
          {category.template_count > 0 && (
            <Alert color="orange" mt="md">
              This category is currently used by {category.template_count} template(s). 
              You cannot delete it until all templates are moved to other categories.
            </Alert>
          )}
        </div>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { 
        color: 'red',
        disabled: category.template_count > 0
      },
      onConfirm: async () => {
        try {
          if (currentSchoolId) {
            await templateCategoryService.deleteTemplateCategory(currentSchoolId, category.id);
            notifications.show({
              title: 'Success',
              message: 'Template category deleted successfully',
              color: 'green',
            });
            await loadCategories();
          }
        } catch (error: any) {
          console.error('Failed to delete template category:', error);
          const message = error?.message || 'Failed to delete template category';
          notifications.show({
            title: 'Error',
            message,
            color: 'red',
          });
        }
      },
    });
  };

  if (!isSchoolManager && !isSuperAdmin) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Access Denied" color="red">
          You don't have permission to manage template categories.
        </Alert>
      </Container>
    );
  }

  // Show message for super admin when no school is selected
  if (isSuperAdmin && !currentSchoolId) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="No School Selected" color="blue">
          Please select a school from the school switcher above to manage categories.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group justify="space-between">
          <div>
            <Title order={2}>Template Categories</Title>
            <Text c="dimmed" size="sm">
              {isSuperAdmin && selectedSchool 
                ? `Managing template categories for ${selectedSchool.name}`
                : 'Manage template categories for your school'
              }
            </Text>
          </div>
          <Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreateCategory}
              disabled={loading}
            >
              Add Category
            </Button>
          </Group>
        </Group>

        <Card>
          {loading ? (
            <Group justify="center" py="xl">
              <Loader />
              <Text>Loading template categories...</Text>
            </Group>
          ) : categories.length === 0 ? (
            <Group justify="center" py="xl">
              <Stack align="center">
                <IconTag size={48} stroke={1} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed">No template categories found</Text>
                <Button leftSection={<IconPlus size={16} />} onClick={handleCreateCategory}>
                  Add Your First Category
                </Button>
              </Stack>
            </Group>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Category Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Color</Table.Th>
                  <Table.Th>Templates</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categories.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text fw={500}>{category.category_name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {category.description || 'No description'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {category.color && (
                        <Group gap="xs">
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              backgroundColor: category.color,
                              border: '1px solid #ccc'
                            }}
                          />
                          <Text size="xs" c="dimmed">{category.color}</Text>
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" size="sm" variant="light">
                        {category.template_count} template{category.template_count !== 1 ? 's' : ''}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(category.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="blue"
                          onClick={() => handleEditCategory(category)}
                          title="Edit template category"
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="red"
                          onClick={() => handleDeleteCategory(category)}
                          title="Delete template category"
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>

      {/* Create/Edit Category Modal */}
      <Modal 
        opened={modalOpened} 
        onClose={closeModal} 
        title={
          <Group>
            <IconTemplate size={20} />
            <Text fw={600}>
              {editingCategory ? 'Edit Template Category' : 'Create New Template Category'}
            </Text>
          </Group>
        }
        size="md"
      >
        <Stack>
          <TextInput
            label="Category Name"
            placeholder="e.g., Lesson Observations"
            value={formData.category_name}
            onChange={(e) => setFormData({...formData, category_name: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Brief description of this template category (optional)"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
          />

          <ColorInput
            label="Color (Optional)"
            placeholder="Pick a color for this category"
            value={formData.color}
            onChange={(value) => setFormData({...formData, color: value})}
            swatches={[
              '#339af0', '#51cf66', '#ff6b6b', '#ffd43b', '#9775fa', 
              '#ff8cc8', '#74c0fc', '#ffa8a8', '#d0bfff', '#8ce99a'
            ]}
          />

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategory}
              leftSection={editingCategory ? <IconCheck size={16} /> : <IconPlus size={16} />}
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}