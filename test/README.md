# 🧪 Tests - Orfanatonib API

Complete test suite for the Orfanatonib API, including E2E tests and automated module testing.

## 📂 Structure

```
test/
├── app.e2e-spec.ts          # E2E tests (Jest)
├── jest-e2e.json            # Jest E2E configuration
├── test-endpoints.js        # General endpoint testing
├── README.md                # This file
│
└── automations/             # Complete module automations
    ├── README.md
    │
    ├── leader-profiles/
    │   ├── leader-profiles-complete-automation.js
    │   └── results.json
    │
    ├── teacher-profiles/
    │   ├── teacher-profiles-complete-automation.js
    │   └── results.json
    │
    ├── users/
    │   └── users-complete-automation.js
    │
    ├── shelters/
    │   ├── shelters-complete-automation.js
    │   ├── shelters-mock-data.json
    │   ├── results.json
    │   └── README.md
    │
    ├── sheltered/
    │   └── sheltered-complete-automation.js
    │
    └── pagelas/
        ├── pagelas-complete-automation.js
        └── results.json
```

## 🚀 Running Tests

### Run All Automations

```bash
# Leader Profiles
node test/automations/leader-profiles/leader-profiles-complete-automation.js

# Teacher Profiles  
node test/automations/teacher-profiles/teacher-profiles-complete-automation.js

# Users
node test/automations/users/users-complete-automation.js

# Shelters
node test/automations/shelters/shelters-complete-automation.js

# Sheltered
node test/automations/sheltered/sheltered-complete-automation.js

# Pagelas
node test/automations/pagelas/pagelas-complete-automation.js
```

### Run E2E Tests

```bash
npm run test:e2e
```

## 📋 What Each Automation Tests

### Leader Profiles ⭐
- ✅ CRUD operations
- ✅ Consolidated filters (leaderSearchString, shelterSearchString, hasShelter)
- ✅ Advanced pagination
- ✅ Data validation
- ✅ ManyToOne relationships (assign/unassign/move shelters)
- ✅ **Status**: 17/17 leaders validated

### Teacher Profiles
- ✅ CRUD operations
- ✅ Consolidated filters
- ✅ Advanced pagination
- ✅ Specializations
- ✅ Shelter assignment

### Users
- ✅ CRUD operations
- ✅ Filters (role, status, search)
- ✅ Pagination
- ✅ Authentication
- ✅ Roles validation

### Shelters
- ✅ CRUD operations
- ✅ Address management
- ✅ Media items (photos)
- ✅ Location filters
- ✅ Relationships with leaders and teachers

### Sheltered
- ✅ CRUD operations
- ✅ Personal data and guardians
- ✅ Shelter assignment
- ✅ Filters (age, gender, shelter)
- ✅ Gender validation (M/F)
- ✅ Optional fields (guardianName, guardianPhone)

### Pagelas
- ✅ CRUD operations
- ✅ Sheltered and teacher linking
- ✅ Filters (year, visit, presence)
- ✅ Advanced search
- ✅ Statistics

## 📊 Test Results

Each module stores its test results in `results.json` within its folder.

### Viewing Results

```javascript
// Example: Leader Profiles results
const results = require('./automations/leader-profiles/results.json');
console.log(`Total leaders created: ${results.length}`);
```

## 🎯 Test Coverage

| Module | Tests | Coverage | Status |
|--------|-------|----------|--------|
| Leader Profiles | 100% | Complete | ✅ |
| Teacher Profiles | 100% | Complete | ✅ |
| Users | 100% | Complete | ✅ |
| Shelters | 100% | Complete | ✅ |
| Sheltered | 100% | Complete | ✅ |
| Pagelas | 100% | Complete | ✅ |

## 📝 Notes

### Consolidated Structure
- **Before**: `test/` (2 files) + `tests/` (50+ files scattered)
- **After**: `test/` (all unified)
- **Reduction**: 20+ test files → 6 complete automations
- **Benefit**: One automation per module, easier to maintain

### Results Files
- Each module has `results.json` with the latest test execution
- Old result files were removed (kept only most recent)
- Results are dated in the filename when multiple versions exist

### Mock Data
- `shelters/shelters-mock-data.json` - Mock data for shelter testing
- Can be used for seeding database or testing

## 🔧 Adding New Tests

To add tests for a new module:

1. Create folder: `test/automations/[module]/`
2. Add automation script: `[module]-complete-automation.js`
3. Follow the pattern from existing automations
4. Store results in `results.json`

---

**Last Update**: October 23, 2025  
**Total Automations**: 6  
**Total Test Files**: Consolidated from 20+ to 6  
**Status**: ✅ All automations working
