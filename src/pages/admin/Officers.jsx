import { useState, useEffect } from 'react';
import {
  getOfficers,
  createOfficer,
  createOfficers,
  updateOfficer,
  deleteOfficer,
  archiveOfficers,
  unarchiveOfficers
} from '../../services/officerService';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploader from '../../components/common/ImageUploader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';

const AdminOfficers = () => {
  const { currentUser } = useAuth();
  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  const currentAcademicStartYear = now.getMonth() >= 6 ? currentCalendarYear : currentCalendarYear - 1;
  const currentTerm = `${currentAcademicStartYear}-${currentAcademicStartYear + 1}`;
  const minYear = 2020;
  const maxYear = currentCalendarYear + 6;
  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => String(minYear + index)
  );

  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkArchiveMode, setBulkArchiveMode] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [selectedOfficerIds, setSelectedOfficerIds] = useState([]);
  const [archiving, setArchiving] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [selectedTermFilter, setSelectedTermFilter] = useState('all');
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    course: 'BSIT',
    year: '',
    term: `${currentAcademicStartYear}-${currentAcademicStartYear + 1}`,
    image: '',
    order: 0
  });
  const [selectedStartYear, setSelectedStartYear] = useState(String(currentAcademicStartYear));
  const [selectedEndYear, setSelectedEndYear] = useState(String(currentAcademicStartYear + 1));
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    confirmColor: 'red'
  });

  const courses = ['BSIT', 'BSIS', 'BSCS', 'WMAD'];
  const years = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'];

  const computedEndYear = String(Number(selectedStartYear) + 1);
  const endYearOptions = [computedEndYear];

  const parseAcademicTerm = (term) => {
    const termText = (term || '').toString();
    const matchedYears = termText.match(/\d{4}/g) || [];

    if (matchedYears.length >= 2) {
      const startYear = matchedYears[0];
      return {
        startYear,
        endYear: String(Number(startYear) + 1)
      };
    }

    if (matchedYears.length === 1) {
      const startYear = matchedYears[0];
      return {
        startYear,
        endYear: String(Number(startYear) + 1)
      };
    }

    return {
      startYear: String(currentAcademicStartYear),
      endYear: String(currentAcademicStartYear + 1)
    };
  };

  const normalizeTerm = (term) => {
    const { startYear, endYear } = parseAcademicTerm(term);
    if (!startYear || !endYear) return '';
    return `${startYear}-${endYear}`;
  };

  const parseBulkOfficerRows = (text) => {
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    const parsedRows = rows.map((row, index) => {
      const columns = row.includes('\t') ? row.split('\t') : row.split(',');
      const [name, position, course = 'BSIT', year = '', term = currentTerm, image = '', order = index + 1] = columns.map((value) => value.trim());
      if (index === 0 && name.toLowerCase() === 'name' && position.toLowerCase() === 'position') {
        return null;
      }
      return {
        name,
        position,
        course: course || 'BSIT',
        year,
        term: normalizeTerm(term || currentTerm),
        image,
        order: Number.parseInt(order, 10) || index + 1
      };
    });

    return parsedRows.filter((officer) => officer?.name && officer?.position);
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      term: `${selectedStartYear}-${selectedEndYear}`
    }));
  }, [selectedStartYear, selectedEndYear]);

  const loadOfficers = async () => {
    try {
      const data = await getOfficers({ includeArchived: true });
      setOfficers(data);
    } catch (error) {
      console.error('Error loading officers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBulkArchive = () => {
    setBulkArchiveMode((prev) => {
      if (prev) {
        setSelectedOfficerIds([]);
      }
      return !prev;
    });
  };

  const toggleOfficerSelection = (id) => {
    setSelectedOfficerIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const handleArchive = (officerIds, termLabel) => {
    if (!officerIds.length) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Archive Officers',
      message: `Archive ${officerIds.length} officer${officerIds.length !== 1 ? 's' : ''}${termLabel ? ` for ${termLabel}` : ''}?`,
      confirmText: 'Archive',
      confirmColor: 'amber',
      onConfirm: async () => {
        setArchiving(true);
        try {
          const metadata = {
            archivedBy: currentUser?.email || 'admin',
            archivedByUid: currentUser?.uid || null,
            archivedTerm: termLabel || ''
          };
          const result = await archiveOfficers(officerIds, metadata);
          if (!result.success) {
            console.error('Archive failed:', result.error);
          }
          setSelectedOfficerIds((prev) => prev.filter((id) => !officerIds.includes(id)));
          setBulkArchiveMode(false);
          loadOfficers();
        } catch (error) {
          console.error('Error archiving officers:', error);
        } finally {
          setArchiving(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleRestore = (officerIds) => {
    if (!officerIds.length) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Restore Officers',
      message: `Restore ${officerIds.length} officer${officerIds.length !== 1 ? 's' : ''} to the active list?`,
      confirmText: 'Restore',
      confirmColor: 'emerald',
      onConfirm: async () => {
        setArchiving(true);
        try {
          const result = await unarchiveOfficers(officerIds);
          if (!result.success) {
            console.error('Restore failed:', result.error);
          }
          setSelectedOfficerIds((prev) => prev.filter((id) => !officerIds.includes(id)));
          loadOfficers();
        } catch (error) {
          console.error('Error restoring officers:', error);
        } finally {
          setArchiving(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleBulkImport = async (event) => {
    event.preventDefault();
    const parsedOfficers = parseBulkOfficerRows(bulkImportText);
    if (!parsedOfficers.length) return;

    setBulkImporting(true);
    try {
      const result = await createOfficers(parsedOfficers);
      if (!result.success) {
        console.error('Bulk officer import failed:', result.error);
      }
      setBulkImportText('');
      setShowBulkImport(false);
      loadOfficers();
    } catch (error) {
      console.error('Error importing officers:', error);
    } finally {
      setBulkImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOfficer) {
        await updateOfficer(editingOfficer.id, formData);
      } else {
        await createOfficer(formData);
      }
      resetForm();
      loadOfficers();
    } catch (error) {
      console.error('Error saving officer:', error);
    }
  };

  const handleEdit = (officer) => {
    const { startYear, endYear } = parseAcademicTerm(officer.term);

    setEditingOfficer(officer);
    setFormData({
      name: officer.name,
      position: officer.position || '',
      course: officer.course || 'BSIT',
      year: officer.year || '',
      term: `${startYear}-${endYear}`,
      image: officer.image || '',
      order: officer.order || 0
    });
    setSelectedStartYear(startYear);
    setSelectedEndYear(endYear);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Officer',
      message: 'Are you sure you want to delete this officer? This action cannot be undone.',
      confirmText: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await deleteOfficer(id);
          loadOfficers();
        } catch (error) {
          console.error('Error deleting officer:', error);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const resetForm = () => {
    setSelectedStartYear(String(currentAcademicStartYear));
    setSelectedEndYear(String(currentAcademicStartYear + 1));
    setFormData({
      name: '',
      position: '',
      course: 'BSIT',
      year: '',
      term: `${currentAcademicStartYear}-${currentAcademicStartYear + 1}`,
      image: '',
      order: 0
    });
    setEditingOfficer(null);
    setShowForm(false);
  };

  const handleStartYearChange = (value) => {
    setSelectedStartYear(value);
    setSelectedEndYear(String(Number(value) + 1));
  };

  const activeOfficers = officers.filter((officer) => !officer.archived);
  const termOptions = [...new Set(officers.map((officer) => normalizeTerm(officer.term)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  const baseVisibleOfficers = showArchived ? officers : activeOfficers;
  const visibleOfficers = selectedTermFilter === 'all'
    ? baseVisibleOfficers
    : baseVisibleOfficers.filter((officer) => normalizeTerm(officer.term) === selectedTermFilter);
  const currentTermOfficers = activeOfficers.filter(
    (officer) => normalizeTerm(officer.term) === currentTerm
  );
  const currentTermOfficerIds = currentTermOfficers.map((officer) => officer.id);
  const selectedOfficers = officers.filter((officer) => selectedOfficerIds.includes(officer.id));
  const selectedBulkPreview = parseBulkOfficerRows(bulkImportText);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Officers</h1>
          <p className="text-gray-500 mt-1">Add and manage organization officers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkImport(true)}
            className="px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0-12l4 4m-4-4L8 8" />
            </svg>
            Bulk Add
          </button>
          <button
            type="button"
            onClick={() => handleArchive(currentTermOfficerIds, currentTerm)}
            disabled={archiving || currentTermOfficerIds.length === 0}
            className="px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Archive {currentTerm}
          </button>
          <button
            type="button"
            onClick={handleToggleBulkArchive}
            className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              bulkArchiveMode
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            {bulkArchiveMode ? 'Cancel Selection' : 'Bulk Archive'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
              showForm
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-linear-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg'
            }`}
          >
            {showForm ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Officer
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <span className="text-sm text-gray-500">
            {activeOfficers.length} active / {officers.length - activeOfficers.length} archived
          </span>
          <div className="relative">
            <select
              value={selectedTermFilter}
              onChange={(event) => setSelectedTermFilter(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All terms</option>
              {termOptions.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>
        </div>
        {bulkArchiveMode && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">{selectedOfficerIds.length} selected</span>
            <button
              type="button"
              onClick={() => handleArchive(selectedOfficerIds, '')}
              disabled={archiving || selectedOfficerIds.length === 0}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Archive Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedOfficerIds([])}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {bulkArchiveMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Archive Checklist</h3>
              <p className="text-sm text-gray-500">Select officers to archive in one action.</p>
            </div>
            <button
              type="button"
              onClick={() => handleArchive(selectedOfficerIds, '')}
              disabled={archiving || selectedOfficerIds.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {`Archive Selected${selectedOfficerIds.length ? ` (${selectedOfficerIds.length})` : ''}`}
            </button>
          </div>

          {selectedOfficers.length === 0 ? (
            <p className="text-sm text-gray-500">Pick officers from the grid to build the archive list.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedOfficers.map((officer) => (
                <label
                  key={officer.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedOfficerIds.includes(officer.id)}
                    onChange={() => toggleOfficerSelection(officer.id)}
                    className="h-4 w-4 text-amber-600 border-gray-300 rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{officer.name}</p>
                    <p className="text-xs text-gray-500">{officer.position} · {normalizeTerm(officer.term)}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={resetForm}
          title={editingOfficer ? 'Edit Officer' : 'Add New Officer'}
          size="3xl"
          backdropClassName="bg-linear-to-br from-blue-100/70 via-white/70 to-slate-100/75 backdrop-blur-[2px]"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Position *</label>
                <input
                  type="text"
                  placeholder="e.g., President, Vice President"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course</label>
                <div className="relative">
                  <select
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                  >
                    {courses.map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year & Section</label>
                <div className="relative">
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                  >
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year</label>
                <div className="relative">
                  <select
                    value={selectedStartYear}
                    onChange={(e) => handleStartYearChange(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Year</label>
                <div className="relative">
                  <select
                    value={selectedEndYear}
                    onChange={(e) => setSelectedEndYear(e.target.value)}
                    disabled
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                  >
                    {endYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-1">Saved as: {selectedStartYear}-{selectedEndYear}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <ImageUploader
              value={formData.image}
              onChange={(url) => setFormData({ ...formData, image: url })}
              folder="ssite/officers"
              label="Officer Photo"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-linear-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editingOfficer ? 'Update Officer' : 'Add Officer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border-2 border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Modal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        title="Bulk Add Officers"
        size="3xl"
        backdropClassName="bg-linear-to-br from-blue-100/70 via-white/70 to-slate-100/75 backdrop-blur-[2px]"
      >
        <form onSubmit={handleBulkImport} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Paste rows from Google Sheets</label>
            <textarea
              value={bulkImportText}
              onChange={(event) => setBulkImportText(event.target.value)}
              placeholder="Name, Position, Course, Year, Term, Image URL, Order"
              rows={8}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-gray-500">
              Accepted columns: name, position, course, year, term, image URL, order. Commas or pasted spreadsheet tabs both work.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">{selectedBulkPreview.length} valid officer{selectedBulkPreview.length === 1 ? '' : 's'} ready to import</p>
            {selectedBulkPreview.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto divide-y divide-gray-200 rounded-lg bg-white">
                {selectedBulkPreview.slice(0, 8).map((officer, index) => (
                  <div key={`${officer.name}-${index}`} className="px-3 py-2 text-sm">
                    <span className="font-semibold text-gray-900">{officer.name}</span>
                    <span className="text-gray-500"> - {officer.position} ({officer.term})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={bulkImporting || selectedBulkPreview.length === 0}
              className="bg-linear-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:from-gray-300 disabled:to-gray-300"
            >
              {bulkImporting ? 'Importing...' : `Import ${selectedBulkPreview.length || ''} Officers`}
            </button>
            <button
              type="button"
              onClick={() => setShowBulkImport(false)}
              className="border-2 border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Officers Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading officers...</p>
        </div>
      ) : visibleOfficers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500">No officers yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {visibleOfficers.map((officer) => (
            <div key={officer.id} className={`bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group ${officer.archived ? 'opacity-80' : ''}`}>
              {/* Photo */}
              <div className="w-full aspect-square bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center relative overflow-hidden">
                {bulkArchiveMode && !officer.archived && (
                  <label className="absolute top-3 left-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 shadow-md">
                    <input
                      type="checkbox"
                      checked={selectedOfficerIds.includes(officer.id)}
                      onChange={() => toggleOfficerSelection(officer.id)}
                      className="h-4 w-4 text-amber-600 border-gray-300 rounded"
                    />
                  </label>
                )}
                {officer.archived && (
                  <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-900/70 text-white">
                    Archived
                  </span>
                )}
                {officer.image ? (
                  <img 
                    src={officer.image} 
                    alt={officer.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-white text-5xl font-bold opacity-50">
                    {officer.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 text-center">
                <h3 className="font-bold text-gray-900 text-sm truncate">{officer.name}</h3>
                <p className="text-blue-600 text-xs font-medium">{officer.course} - {officer.year}</p>
                <p className="text-gray-500 text-xs">{officer.position}</p>
                <p className="text-gray-400 text-xs mt-1">{normalizeTerm(officer.term)}</p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2 justify-center">
                {officer.archived ? (
                  <button
                    onClick={() => handleRestore([officer.id])}
                    className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors flex-1"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(officer)}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors flex-1"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(officer.id)}
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmColor={confirmDialog.confirmColor}
        loading={archiving}
      />
    </div>
  );
};

export default AdminOfficers;
