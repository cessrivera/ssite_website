import Modal from './Modal';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmColor = 'red', loading = false }) => {
  const colorClasses = {
    red: 'from-red-600 to-red-700',
    blue: 'from-blue-600 to-blue-700',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
          confirmColor === 'red' ? 'bg-red-100' : confirmColor === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
        }`}>
          <svg className={`w-7 h-7 ${
            confirmColor === 'red' ? 'text-red-600' : confirmColor === 'amber' ? 'text-amber-600' : 'text-blue-600'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border-2 border-gray-200 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 bg-gradient-to-r ${colorClasses[confirmColor] || colorClasses.red} text-white px-4 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
