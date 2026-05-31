import type { ReactNode } from 'react';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

export const BottomSheet = ({ isOpen, onClose, children, title }: BottomSheetProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 200,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          zIndex: 201,
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideUp 0.3s ease',
          paddingBottom: '24px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '4px',
            background: '#E5E7EB',
            borderRadius: '2px',
            margin: '12px auto 8px',
          }}
        />

        {title ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 18px 14px',
              borderBottom: '0.5px solid #F3F4F6',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#18181A',
              }}
            >
              {title}
            </h3>
            <button
              aria-label="Yopish"
              onClick={onClose}
              style={{
                background: '#F3F4F6',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6B6A66',
              }}
              type="button"
            >
              x
            </button>
          </div>
        ) : null}

        {children}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes slideUp {
          from { transform: translateY(100%) }
          to { transform: translateY(0) }
        }
      `}</style>
    </>
  );
};

export default BottomSheet;
