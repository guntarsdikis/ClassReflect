# TLC Template Import - UI Integration

## Backend API Endpoint ✅
- **Endpoint:** `POST /api/schools/:schoolId/import-tlc-templates`
- **Auth:** Super Admin only
- **Function:** Imports both TLC templates with all criteria to specified school
- **Response:** Returns imported template details and success message

## Frontend Integration Points

### 1. School Management Table - Add Action Icon

**File:** `frontend/src/features/schools/components/SchoolManagement.tsx`

**Location:** Around line 312, add after the IconBan action:

```typescript
// Add this import at the top
import { IconTemplate } from '@tabler/icons-react';

// Add this in the actions Group (after IconBan)
<ActionIcon 
  variant="subtle" 
  color="green"
  onClick={() => handleImportTLC(school)}
  title="Import Teach Like a Champion Templates"
>
  <IconTemplate size={16} />
</ActionIcon>
```

### 2. Add Handler Function

Add this function in the SchoolManagement component:

```typescript
const handleImportTLC = async (school: School) => {
  modals.openConfirmModal({
    title: 'Import Teach Like a Champion Templates',
    children: (
      <Text size="sm">
        This will import 2 research-proven TLC templates to "{school.name}":
        <br />• Foundation Techniques (19 criteria)
        <br />• Complete Framework (16 criteria)
        <br /><br />
        Templates will be available immediately for all teachers in this school.
      </Text>
    ),
    labels: { confirm: 'Import Templates', cancel: 'Cancel' },
    confirmProps: { color: 'green' },
    onConfirm: async () => {
      try {
        await schoolsService.importTLCTemplates(school.id);
        notifications.show({
          title: 'Templates Imported',
          message: `TLC templates successfully added to ${school.name}`,
          color: 'green'
        });
        loadSchools(); // Refresh the list if needed
      } catch (error) {
        notifications.show({
          title: 'Import Failed',
          message: error.message || 'Failed to import templates',
          color: 'red'
        });
      }
    }
  });
};
```

### 3. Add Service Method

**File:** `frontend/src/features/schools/services/schools.service.ts`

Add this method to the schoolsService:

```typescript
async importTLCTemplates(schoolId: number) {
  const response = await apiClient.post(`/schools/${schoolId}/import-tlc-templates`);
  return response.data;
}
```

## Alternative UI Locations

### Option 1: School Detail Page
- Add "Import TLC Templates" button on individual school view
- Better for detailed template management per school

### Option 2: Template Management Page  
- Add "Import from Library" button in template management
- More contextual for template-focused workflows

### Option 3: Bulk Operations
- Add checkbox selection and bulk import for multiple schools
- Efficient for setting up many schools at once

## Template Import Features

### What Gets Imported:
1. **Foundation Techniques Template**
   - 19 detailed criteria (Cold Call, Wait Time, No Opt Out, etc.)
   - Weights perfectly balanced to 100%
   - Ideal for new teachers

2. **Complete Framework Template**  
   - 16 comprehensive criteria covering all TLC methods
   - Includes lesson planning, classroom management, culture
   - For experienced teachers

### Smart Import Logic:
- ✅ Creates "Teaching Methods" category if needed
- ✅ Skips templates that already exist (no duplicates)
- ✅ Assigns templates to specific school (not global)
- ✅ Provides detailed success/failure feedback

## Usage Flow:
1. Super admin browses schools in School Management
2. Clicks template import icon for desired school  
3. Confirms import in modal dialog
4. Templates appear immediately in that school's template dropdown
5. Teachers can use templates in upload wizard and analysis

This creates a seamless way for super admins to provision schools with proven, research-based teaching evaluation templates.